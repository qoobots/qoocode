/**
 * ListMcpResourcesTool - List available resources from MCP servers
 */
import { z } from 'zod'
import { buildTool, type ToolCallContext } from '../../Tool.js'
import { getMCPManager, type MCPResource } from '../../services/mcp/mcpClient.js'

// Input schema
const inputSchema = z.object({
  server: z.string().optional().describe('Name of the MCP server (optional, lists all if not specified)'),
})

type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  resources: z.array(z.object({
    uri: z.string(),
    name: z.string(),
    description: z.string().optional(),
    mimeType: z.string().optional(),
    server: z.string(),
  })),
  error: z.string().optional(),
})

type Output = z.infer<typeof outputSchema>

export const ListMcpResourcesTool = buildTool({
  name: 'list_mcp_resources',
  inputSchema,
  outputSchema,
  
  async checkPermissions() {
    return { behavior: 'allow' }
  },
  
  async call(input: InputSchema, _context: ToolCallContext): Promise<Output> {
    const manager = getMCPManager()
    const resources: Output['resources'] = []
    
    try {
      const servers = input.server 
        ? [[input.server, manager.getServer(input.server)]].filter(([, c]) => c !== undefined) as Array<[string, NonNullable<ReturnType<typeof manager.getServer>>]>
        : Array.from(manager.getAllServers().entries())
      
      if (servers.length === 0) {
        return {
          resources: [],
          error: input.server 
            ? `MCP server "${input.server}" not found`
            : 'No MCP servers connected',
        }
      }
      
      for (const [serverId, client] of servers) {
        const serverResources = client.getResources()
        const serverInfo = client.getServerInfo()
        
        for (const resource of serverResources) {
          resources.push({
            ...resource,
            server: serverInfo.name || serverId,
          })
        }
      }
      
      return { resources }
    } catch (error) {
      return {
        resources: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
  
  async description() {
    return 'List all available resources from connected MCP servers'
  },
  
  renderToolResultMessage(output: Output): string {
    if (output.error) {
      return `Error: ${output.error}`
    }
    
    if (output.resources.length === 0) {
      return 'No MCP resources available'
    }
    
    const lines = ['Available MCP Resources:']
    let currentServer = ''
    for (const resource of output.resources) {
      if (resource.server !== currentServer) {
        currentServer = resource.server
        lines.push(`\n  ${currentServer}:`)
      }
      lines.push(`    ${resource.uri}`)
      if (resource.description) {
        lines.push(`      ${resource.description}`)
      }
    }
    
    return lines.join('\n')
  },
})

export default ListMcpResourcesTool
