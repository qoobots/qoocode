/**
 * ReadMcpResourceTool - Read a resource from an MCP server
 */
import { z } from 'zod'
import { buildTool, type ToolCallContext } from '../../Tool.js'
import { getMCPManager } from '../../services/mcp/mcpClient.js'

// Input schema
const inputSchema = z.object({
  uri: z.string().describe('URI of the resource to read'),
  server: z.string().optional().describe('Name of the MCP server (auto-detected if not specified)'),
})

type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  contents: z.array(z.object({
    uri: z.string(),
    mimeType: z.string().optional(),
    text: z.string().optional(),
    blob: z.string().optional(),
  })),
  error: z.string().optional(),
})

type Output = z.infer<typeof outputSchema>

export const ReadMcpResourceTool = buildTool({
  name: 'read_mcp_resource',
  inputSchema,
  outputSchema,
  
  async checkPermissions() {
    return { behavior: 'allow' }
  },
  
  async call(input: InputSchema, _context: ToolCallContext): Promise<Output> {
    const { uri, server } = input
    const manager = getMCPManager()
    
    try {
      // Find the server
      let client = server ? manager.getServer(server) : undefined
      
      if (!client) {
        // Try to find by server name
        for (const [, c] of manager.getAllServers()) {
          const info = c.getServerInfo()
          if (server && (info.name === server)) {
            client = c
            break
          }
        }
      }
      
      // Try any server that has the resource
      if (!client) {
        for (const [, c] of manager.getAllServers()) {
          const resources = c.getResources()
          if (resources.some(r => r.uri === uri)) {
            client = c
            break
          }
        }
      }
      
      if (!client) {
        return {
          contents: [],
          error: `Resource "${uri}" not found on any connected MCP server`,
        }
      }
      
      const result = await client.readResource(uri)
      
      return {
        contents: [{
          uri,
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        }],
      }
    } catch (error) {
      return {
        contents: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
  
  async description() {
    return 'Read a specific resource from an MCP server by its URI'
  },
  
  renderToolResultMessage(output: Output): string {
    if (output.error) {
      return `Error: ${output.error}`
    }
    
    if (output.contents.length === 0) {
      return '(no content)'
    }
    
    const lines: string[] = []
    for (const content of output.contents) {
      if (content.text) {
        lines.push(content.text)
      } else if (content.blob) {
        lines.push(`[Binary data: ${content.blob.length} bytes]`)
      }
    }
    
    return lines.join('\n') || '(empty)'
  },
})

export default ReadMcpResourceTool
