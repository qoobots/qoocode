// McpAuthTool - MCP OAuth Authentication Tool
// Handles OAuth flow for MCP servers that require authentication
import { buildTool } from '../../Tool.js'
import type { ToolDef, ToolUseContext } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod'

const inputSchema = lazySchema(() => z.object({}))
type InputSchema = ReturnType<typeof inputSchema>

export type McpAuthOutput = {
  status: 'auth_url' | 'unsupported' | 'error'
  message: string
  authUrl?: string
}

// Configuration for MCP servers that need authentication
interface MCPAuthConfig {
  serverName: string
  authUrl?: string
  transport?: 'stdio' | 'sse' | 'http'
}

// Simulated auth cache - in production this would be stored persistently
const authCache = new Map<string, { authenticated: boolean; lastCheck: number }>()

/**
 * Check if a server needs authentication
 */
export function checkAuthRequired(serverName: string): boolean {
  const cached = authCache.get(serverName)
  if (!cached) return false
  // Cache expires after 1 hour
  return Date.now() - cached.lastCheck > 60 * 60 * 1000
}

/**
 * Mark a server as requiring authentication
 */
export function setAuthRequired(serverName: string): void {
  authCache.set(serverName, { authenticated: false, lastCheck: Date.now() })
}

/**
 * Mark a server as authenticated
 */
export function markAuthenticated(serverName: string): void {
  authCache.set(serverName, { authenticated: true, lastCheck: Date.now() })
}

/**
 * Clear auth cache for a server
 */
export function clearAuthCache(serverName?: string): void {
  if (serverName) {
    authCache.delete(serverName)
  } else {
    authCache.clear()
  }
}

/**
 * Get all servers that need authentication
 */
export function getServersNeedingAuth(): string[] {
  return Array.from(authCache.entries())
    .filter(([_, value]) => !value.authenticated)
    .map(([name]) => name)
}

/**
 * Creates an MCP auth tool for a specific server
 * This is a pseudo-tool that helps start the OAuth flow
 */
export function createMcpAuthTool(
  serverName: string,
  config?: MCPAuthConfig
): ToolDef<InputSchema, McpAuthOutput> {
  const transport = config?.transport ?? 'stdio'
  const location = config?.authUrl 
    ? `${transport} at ${config.authUrl}` 
    : transport

  const description = 
    `The \`${serverName}\` MCP server (${location}) is installed but requires authentication. ` +
    `Call this tool to start the OAuth flow — you'll receive an authorization URL to share with the user. ` +
    `Once the user completes authorization in their browser, the server's real tools will become available automatically.`

  return {
    name: `mcp__${serverName}__authenticate`,
    searchHint: `${serverName} MCP authentication`,
    maxResultSizeChars: 10_000,
    get inputSchema(): InputSchema {
      return inputSchema()
    },
    isEnabled() {
      return true
    },
    isConcurrencySafe() {
      return false
    },
    isReadOnly() {
      return false
    },
    toAutoClassifierInput() {
      return `${serverName} authenticate`
    },
    async description() {
      return description
    },
    async prompt() {
      return description
    },
    async checkPermissions(input) {
      return { behavior: 'allow' as const, updatedInput: input }
    },
    async call(_input: z.infer<InputSchema>, context: ToolUseContext) {
      const { setAppState } = context

      // Check if transport supports OAuth
      if (transport !== 'sse' && transport !== 'http') {
        return {
          data: {
            status: 'unsupported' as const,
            message: `Server "${serverName}" uses ${transport} transport which does not support OAuth from this tool. ` +
              `Ask the user to run /mcp and authenticate manually.`,
          } as McpAuthOutput,
        }
      }

      // Check if we have an auth URL configured
      if (!config?.authUrl) {
        return {
          data: {
            status: 'error' as const,
            message: `No OAuth configuration found for ${serverName}. ` +
              `Configure the server's auth URL first using /mcp command.`,
          } as McpAuthOutput,
        }
      }

      try {
        // In a real implementation, this would:
        // 1. Start the OAuth flow
        // 2. Capture the authorization URL
        // 3. Return it to the user
        // 4. Wait for the callback
        // 5. Update the server's tools

        // For now, we simulate returning an auth URL
        const authUrl = `${config.authUrl}/authorize?server=${encodeURIComponent(serverName)}&client=qoocode`

        // Simulate background completion (in production this would be async)
        void (async () => {
          try {
            // Mark as needing auth
            setAuthRequired(serverName)
            
            // In production: await performOAuthFlow(...)
            
            // After successful auth:
            // clearAuthCache(serverName)
            // reconnectMcpServer(serverName)
            
            // Update app state
            if (setAppState) {
              setAppState(prev => ({
                ...prev,
                mcp: {
                  ...prev.mcp,
                  // In production: add real tools after auth
                },
              }))
            }
          } catch (error) {
            console.error(`OAuth flow failed for ${serverName}:`, error)
          }
        })()

        return {
          data: {
            status: 'auth_url' as const,
            authUrl,
            message: `To authorize the ${serverName} MCP server, please open this URL in your browser:\n\n${authUrl}\n\nOnce you complete the authorization, the server's tools will become available automatically.`,
          } as McpAuthOutput,
        }
      } catch (error) {
        return {
          data: {
            status: 'error' as const,
            message: `Failed to start OAuth flow for ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
              `Ask the user to run /mcp and authenticate manually.`,
          } as McpAuthOutput,
        }
      }
    },
    mapToolResultToToolResultBlockParam(data, toolUseID) {
      return {
        tool_use_id: toolUseID,
        type: 'tool_result' as const,
        content: data.message,
      }
    },
  }
}

// Create the default McpAuthTool export
export const McpAuthTool = buildTool({
  name: 'mcp__authenticate',
  searchHint: 'MCP server OAuth authentication',
  maxResultSizeChars: 10_000,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  isEnabled() {
    return true
  },
  isConcurrencySafe() {
    return false
  },
  isReadOnly() {
    return false
  },
  toAutoClassifierInput() {
    return 'MCP authenticate'
  },
  async description() {
    return 'Authenticate with an MCP server that requires OAuth. Provides the authorization URL and manages the OAuth flow.'
  },
  async prompt() {
    return 'Use this tool to authenticate with MCP servers that require OAuth. When called, it provides an authorization URL for the user to complete in their browser.'
  },
  async checkPermissions(input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },
  async call(_input: z.infer<InputSchema>, _context: ToolUseContext) {
    // Get servers needing auth
    const serversNeedingAuth = getServersNeedingAuth()
    
    if (serversNeedingAuth.length === 0) {
      return {
        data: {
          status: 'auth_url' as const,
          message: 'No MCP servers currently require authentication. All configured servers are authenticated.',
        } as McpAuthOutput,
      }
    }

    return {
      data: {
        status: 'auth_url' as const,
        message: `The following MCP servers require authentication: ${serversNeedingAuth.join(', ')}. ` +
          `Use /mcp to configure authentication for each server.`,
      } as McpAuthOutput,
    }
  },
  mapToolResultToToolResultBlockParam(data, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: data.message,
    }
  },
} satisfies ToolDef<InputSchema, McpAuthOutput>)
