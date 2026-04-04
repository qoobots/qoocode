/**
 * qoocode JWT Authentication Provider
 * Provides JWT-based authentication for qoocode IDE integration
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { QoocodeConfig } from '../config/config';

export interface TokenPayload {
  sub: string;        // Subject (user ID)
  iss: string;        // Issuer
  exp: number;        // Expiration time
  iat: number;        // Issued at
  workspace?: string; // Workspace path
  permissions?: string[]; // Granted permissions
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'bearer';
}

export interface AuthState {
  isAuthenticated: boolean;
  userId?: string;
  permissions?: string[];
  expiresAt?: number;
}

export class QoocodeAuthProvider {
  private config: QoocodeConfig;
  private context: vscode.ExtensionContext;
  private currentToken: AuthToken | undefined;
  private refreshTimer: NodeJS.Timeout | undefined;
  private stateChangedEmitter = new vscode.EventEmitter<AuthState>();

  public readonly onStateChanged = this.stateChangedEmitter.event;

  constructor(context: vscode.ExtensionContext, config: QoocodeConfig) {
    this.context = context;
    this.config = config;
    this.loadStoredToken();
  }

  /**
   * Load stored token from secure storage
   */
  private async loadStoredToken(): Promise<void> {
    try {
      const stored = await this.context.secrets.get('qoocode.auth.token');
      if (stored) {
        this.currentToken = JSON.parse(stored);
        if (this.currentToken && this.currentToken.expiresAt > Date.now()) {
          this.scheduleRefresh();
        } else {
          this.currentToken = undefined;
        }
      }
    } catch (error) {
      console.error('Failed to load stored token:', error);
    }
  }

  /**
   * Save token to secure storage
   */
  private async saveToken(token: AuthToken): Promise<void> {
    try {
      await this.context.secrets.store('qoocode.auth.token', JSON.stringify(token));
      this.currentToken = token;
      this.scheduleRefresh();
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  /**
   * Clear stored token
   */
  private async clearToken(): Promise<void> {
    try {
      await this.context.secrets.delete('qoocode.auth.token');
      this.currentToken = undefined;
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = undefined;
      }
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }

  /**
   * Schedule token refresh
   */
  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (this.currentToken) {
      const refreshTime = this.currentToken.expiresAt - (5 * 60 * 1000); // 5 minutes before expiry
      const delay = Math.max(refreshTime - Date.now(), 0);

      this.refreshTimer = setTimeout(() => {
        this.refreshAccessToken();
      }, delay);
    }
  }

  /**
   * Generate JWT token (simplified for demo - use proper JWT library in production)
   */
  private generateToken(payload: TokenPayload, secret: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify and decode JWT token
   */
  private verifyToken(token: string, secret: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, signature] = parts;
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      if (signature !== expectedSignature) return null;

      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as TokenPayload;
      
      // Check expiration
      if (payload.exp < Date.now() / 1000) return null;

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Sign in with credentials
   */
  public async signIn(apiKey?: string): Promise<boolean> {
    try {
      const secret = this.config.get('auth.secret') || this.generateSecret();
      const userId = this.config.get('auth.userId') || this.generateUserId();
      
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 3600; // 1 hour

      const payload: TokenPayload = {
        sub: userId,
        iss: 'qoocode',
        exp: now + expiresIn,
        iat: now,
        permissions: this.config.get('auth.permissions') || ['default']
      };

      const accessToken = this.generateToken(payload, secret);
      const refreshToken = crypto.randomBytes(32).toString('hex');

      const authToken: AuthToken = {
        accessToken,
        refreshToken,
        expiresAt: Date.now() + (expiresIn * 1000),
        tokenType: 'bearer'
      };

      await this.saveToken(authToken);
      
      this.stateChangedEmitter.fire({
        isAuthenticated: true,
        userId,
        permissions: payload.permissions,
        expiresAt: authToken.expiresAt
      });

      return true;
    } catch (error) {
      console.error('Sign in failed:', error);
      return false;
    }
  }

  /**
   * Sign out
   */
  public async signOut(): Promise<void> {
    await this.clearToken();
    
    this.stateChangedEmitter.fire({
      isAuthenticated: false
    });
  }

  /**
   * Get current auth state
   */
  public getAuthState(): AuthState {
    if (!this.currentToken || this.currentToken.expiresAt <= Date.now()) {
      return { isAuthenticated: false };
    }

    const secret = this.config.get('auth.secret') || '';
    const payload = this.verifyToken(this.currentToken.accessToken, secret);

    return {
      isAuthenticated: !!payload,
      userId: payload?.sub,
      permissions: payload?.permissions,
      expiresAt: this.currentToken.expiresAt
    };
  }

  /**
   * Get current access token
   */
  public async getAccessToken(): Promise<string | undefined> {
    if (!this.currentToken || this.currentToken.expiresAt <= Date.now()) {
      return undefined;
    }
    return this.currentToken.accessToken;
  }

  /**
   * Refresh access token
   */
  public async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.currentToken?.refreshToken) {
        return false;
      }

      const secret = this.config.get('auth.secret') || this.generateSecret();
      const userId = this.config.get('auth.userId') || this.generateUserId();
      
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = 3600;

      const payload: TokenPayload = {
        sub: userId,
        iss: 'qoocode',
        exp: now + expiresIn,
        iat: now,
        permissions: this.config.get('auth.permissions') || ['default']
      };

      const accessToken = this.generateToken(payload, secret);

      const authToken: AuthToken = {
        accessToken,
        refreshToken: this.currentToken.refreshToken,
        expiresAt: Date.now() + (expiresIn * 1000),
        tokenType: 'bearer'
      };

      await this.saveToken(authToken);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Validate token has required permission
   */
  public hasPermission(permission: string): boolean {
    const state = this.getAuthState();
    if (!state.isAuthenticated) return false;
    return state.permissions?.includes(permission) || state.permissions?.includes('bypassPermissions') || false;
  }

  /**
   * Generate a secret key for JWT signing
   */
  private generateSecret(): string {
    const secret = crypto.randomBytes(32).toString('hex');
    this.config.set('auth.secret', secret);
    return secret;
  }

  /**
   * Generate a unique user ID
   */
  private generateUserId(): string {
    const userId = `user_${crypto.randomBytes(8).toString('hex')}`;
    this.config.set('auth.userId', userId);
    return userId;
  }

  /**
   * Dispose the auth provider
   */
  public dispose(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.stateChangedEmitter.dispose();
  }
}
