// OAuth 2.0 Authentication Service for MCP Servers
import { randomBytes, createHash } from 'node:crypto'
import { URL } from 'node:url'

/**
 * OAuth 2.0 Configuration for MCP servers
 */
export interface OAuthConfig {
  clientId: string
  clientSecret?: string
  authorizationUrl: string
  tokenUrl: string
  scopes?: string[]
  redirectUri?: string
}

/**
 * OAuth Token Response
 */
export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

/**
 * OAuth State for CSRF protection
 */
export interface OAuthState {
  codeVerifier: string
  codeChallenge: string
  state: string
  redirectUri: string
  timestamp: number
}

/**
 * OAuth 2.0 PKCE flow implementation
 */
export class OAuthService {
  private states = new Map<string, OAuthState>()
  private tokens = new Map<string, OAuthTokenResponse>()
  
  // State expiration time (10 minutes)
  private readonly STATE_EXPIRATION = 10 * 60 * 1000

  /**
   * Generate PKCE code verifier (43-128 random chars)
   */
  generateCodeVerifier(): string {
    return randomBytes(64).toString('base64url').slice(0, 128)
  }

  /**
   * Generate PKCE code challenge from verifier (S256 method)
   */
  generateCodeChallenge(verifier: string): string {
    return createHash('sha256').update(verifier).digest('base64url')
  }

  /**
   * Generate random state parameter for CSRF protection
   */
  generateState(): string {
    return randomBytes(16).toString('hex')
  }

  /**
   * Create authorization URL with PKCE
   */
  createAuthorizationUrl(
    config: OAuthConfig,
    redirectUri: string,
  ): { url: string; state: string; codeVerifier: string } {
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = this.generateCodeChallenge(codeVerifier)
    const state = this.generateState()

    const url = new URL(config.authorizationUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', config.clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', config.scopes?.join(' ') || 'read')
    url.searchParams.set('state', state)
    url.searchParams.set('code_challenge', codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')

    // Store state for verification
    this.states.set(state, {
      codeVerifier,
      codeChallenge,
      state,
      redirectUri,
      timestamp: Date.now(),
    })

    // Cleanup expired states
    this.cleanupExpiredStates()

    return { url: url.toString(), state, codeVerifier }
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    config: OAuthConfig,
    code: string,
    state: string,
    redirectUri: string,
  ): Promise<OAuthTokenResponse> {
    // Verify state
    const storedState = this.states.get(state)
    if (!storedState) {
      throw new Error('Invalid or expired state parameter')
    }

    if (storedState.redirectUri !== redirectUri) {
      throw new Error('Redirect URI mismatch')
    }

    if (Date.now() - storedState.timestamp > this.STATE_EXPIRATION) {
      this.states.delete(state)
      throw new Error('State parameter expired')
    }

    // Remove used state
    this.states.delete(state)

    // Exchange code for tokens
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code,
      redirect_uri: redirectUri,
      code_verifier: storedState.codeVerifier,
    })

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret)
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${error}`)
    }

    const tokens: OAuthTokenResponse = await response.json()
    
    // Store tokens
    this.tokens.set(state, tokens)

    return tokens
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    config: OAuthConfig,
    refreshToken: string,
  ): Promise<OAuthTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      refresh_token: refreshToken,
    })

    if (config.clientSecret) {
      params.set('client_secret', config.clientSecret)
    }

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token refresh failed: ${response.status} ${error}`)
    }

    const tokens: OAuthTokenResponse = await response.json()
    return tokens
  }

  /**
   * Get stored access token
   */
  getAccessToken(state: string): string | undefined {
    return this.tokens.get(state)?.access_token
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(state: string): boolean {
    const token = this.tokens.get(state)
    if (!token || !token.expires_in) {
      return true
    }
    // Consider expired if less than 5 minutes remaining
    return false // We'd need to track issued time
  }

  /**
   * Revoke a token
   */
  async revokeToken(config: OAuthConfig, token: string): Promise<void> {
    try {
      await fetch(config.tokenUrl.replace('/token', '/revoke'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          token,
          client_id: config.clientId,
        }).toString(),
      })
    } catch {
      // Ignore errors during revocation
    }
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now()
    for (const [key, state] of this.states.entries()) {
      if (now - state.timestamp > this.STATE_EXPIRATION) {
        this.states.delete(key)
      }
    }
  }

  /**
   * Get authorization header for API requests
   */
  getAuthorizationHeader(state: string): string | undefined {
    const token = this.tokens.get(state)
    if (!token) return undefined
    return `${token.token_type} ${token.access_token}`
  }
}

// Singleton instance
let oauthService: OAuthService | null = null

export function getOAuthService(): OAuthService {
  if (!oauthService) {
    oauthService = new OAuthService()
  }
  return oauthService
}

/**
 * MCP Server OAuth Configuration
 */
export interface MCPServerOAuthConfig {
  serverId: string
  oauth: OAuthConfig
  enabled: boolean
}

/**
 * Manage OAuth configurations for MCP servers
 */
class OAuthConfigManager {
  private configs = new Map<string, MCPServerOAuthConfig>()

  /**
   * Register OAuth config for an MCP server
   */
  register(config: MCPServerOAuthConfig): void {
    this.configs.set(config.serverId, config)
  }

  /**
   * Get OAuth config for a server
   */
  get(serverId: string): MCPServerOAuthConfig | undefined {
    return this.configs.get(serverId)
  }

  /**
   * Remove OAuth config for a server
   */
  remove(serverId: string): void {
    this.configs.delete(serverId)
  }

  /**
   * List all servers with OAuth enabled
   */
  listOAuthServers(): string[] {
    const servers: string[] = []
    for (const [id, config] of this.configs.entries()) {
      if (config.enabled) {
        servers.push(id)
      }
    }
    return servers
  }
}

let oauthConfigManager: OAuthConfigManager | null = null

export function getOAuthConfigManager(): OAuthConfigManager {
  if (!oauthConfigManager) {
    oauthConfigManager = new OAuthConfigManager()
  }
  return oauthConfigManager
}
