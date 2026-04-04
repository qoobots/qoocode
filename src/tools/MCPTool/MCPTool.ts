/**
 * MCPTool - Model Context Protocol Tool
 * 
 * Provides a unified interface for calling tools from MCP servers.
 */
import { z } from 'zod'
import { buildTool, type ToolCallContext } from '../../Tool.js'
import { getMCPManager, type MCPTool as MCPToolType } from '../../services/mcp/mcpClient.js'

// Input schema for MCP tool calls
const inputSchema = z.object({
  server: z.string().describe('Name of the MCP server'),
  tool: z.string().describe('Name of the tool to call'),
  arguments: z.record(z.unknown()).optional().describe('Arguments to pass to the tool'),
})

type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z.string().optional(),
})

type Output = z.infer<typeof outputSchema>

/**
 * Get list of available MCP tools from all connected servers
 */
export async function getAvailableMCPTools(): Promise<Array<MCPToolType & { server: string }>> {
  const manager = getMCPManager()
  const allTools: Array<MCPToolType & { server: string }> = []
  
  for (const [serverId, client] of manager.getAllServers()) {
    const tools = client.getTools()
    for (const tool of tools) {
      allTools.push({
        ...tool,
        server: serverId,
      })
    }
  }
  
  return allTools
}

/**
 * Format MCP tool result for display
 */
export function formatMCPToolResult(result: unknown): string {
  if (typeof result === 'string') {
    return result
  }
  if (result === null || result === undefined) {
    return '(no result)'
  }
  if (typeof result === 'object') {
    return JSON.stringify(result, null, 2)
  }
  return String(result)
}

export const MCPTool = buildTool({
  name: 'mcp',
  inputSchema,
  outputSchema,
  maxResultSizeChars: 100000,
  
  async checkPermissions() {
    return {
      behavior: 'allow',
      message: 'MCP tool calls are allowed by default',
    }
  },
  
  async call(input: InputSchema, context: ToolCallContext): Promise<Output> {
    const { server, tool, arguments: args = {} } = input
    const manager = getMCPManager()
    
    try {
      // Find the server
      const client = manager.getServer(server)
      
      if (!client) {
        // Try to find by server name
        for (const [id, c] of manager.getAllServers()) {
          const info = c.getServerInfo()
          if (info.name === server || id === server) {
            return await executeTool(c, tool, args)
          }
        }
        return {
          success: false,
          error: `MCP server "${server}" not found. Available servers: ${Array.from(manager.getAllServers().keys()).join(', ') || 'none'}`,
        }
      }
      
      return await executeTool(client, tool, args)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
  
  async description() {
    const tools = await getAvailableMCPTools()
    if (tools.length === 0) {
      return 'Call a tool from a connected MCP server. No servers connected.'
    }
    
    const serverGroups = new Map<string, MCPToolType[]>()
    for (const tool of tools) {
      const existing = serverGroups.get(tool.server) || []
      existing.push(tool)
      serverGroups.set(tool.server, existing)
    }
    
    const lines = ['Call a tool from a connected MCP server. Available tools:']
    for (const [serverName, serverTools] of serverGroups) {
      lines.push(`  ${serverName}:`)
      for (const t of serverTools) {
        lines.push(`    - ${t.name}: ${t.description || 'no description'}`)
      }
    }
    
    return lines.join('\n')
  },
  
  async prompt() {
    const tools = await getAvailableMCPTools()
    if (tools.length === 0) {
      return 'No MCP servers are connected. Use /mcp to manage MCP servers.'
    }
    
    return `MCP servers are connected with the following tools available. Use the mcp tool to call them.`
  },
  
  renderToolUseMessage(input: InputSchema): string {
    return `Calling MCP tool: ${input.server}/${input.tool}`
  },
  
  renderToolResultMessage(output: Output): string {
    if (!output.success) {
      return `Error: ${output.error}`
    }
    return formatMCPToolResult(output.result)
  },
  
  isResultTruncated(output: Output): boolean {
    const resultStr = typeof output.result === 'string' 
      ? output.result 
      : JSON.stringify(output.result || '')
    return resultStr.length > 100000
  },
})

/**
 * Execute a tool on an MCP client
 */
async function executeTool(
  client: ReturnType<typeof getMCPManager> extends Map<string, infer C> ? C : never,
  toolName: string,
  args: Record<string, unknown>
): Promise<Output> {
  try {
    const result = await client.callTool(toolName, args)
    return {
      success: true,
      result,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export default MCPTool
