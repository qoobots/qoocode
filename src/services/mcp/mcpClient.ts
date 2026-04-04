// MCP Client - Model Context Protocol implementation
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'
import { EventEmitter } from 'node:events'

// Re-export SSE transport types
export { SSETransport, SSEStreamTransport, type MCPTansportType, type TransportConfig } from './sseTransport.js'

// MCP message types
export interface MCPRequest {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: Record<string, unknown>
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

export interface MCPNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

// MCP tool representation
export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

// MCP resource representation
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

// MCP server status
export type MCPServerStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

// Transport interface
interface MCPTransport {
  start(): Promise<void>
  sendRequest(method: string, params?: Record<string, unknown>): Promise<MCPResponse>
  sendNotification(method: string, params?: Record<string, unknown>): void
  stop(): void
  on(event: string, listener: (...args: unknown[]) => void): void
  off(event: string, listener: (...args: unknown[]) => void): void
}

// Stdio transport for MCP
export class StdioTransport implements MCPTransport {
  private process: ChildProcessWithoutNullStreams | null = null
  private requestId = 0
  private pendingRequests = new Map<number | string, { resolve: (value: MCPResponse) => void; reject: (error: Error) => void }>()
  private messageBuffer = ''

  constructor(
    private command: string,
    private args: string[] = [],
    private env: Record<string, string> = {},
  ) {}

  // Start the MCP server process
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.command, this.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...this.env },
        })

        this.process.stdout.on('data', (data) => {
          this.handleData(data.toString())
        })

        this.process.stderr.on('data', (data) => {
          console.error('[MCP Server]:', data.toString())
        })

        this.process.on('error', (error) => {
          reject(error)
        })

        this.process.on('exit', (code) => {
          this.handleDisconnect()
        })

        // Wait for process to be ready
        setTimeout(() => resolve(), 500)
      } catch (error) {
        reject(error)
      }
    })
  }

  // Handle incoming data
  private handleData(data: string): void {
    this.messageBuffer += data

    // Try to parse complete JSON messages
    const messages = this.messageBuffer.split('\n')
    this.messageBuffer = messages.pop() || '' // Keep incomplete message in buffer

    for (const msg of messages) {
      if (msg.trim()) {
        try {
          const parsed = JSON.parse(msg) as MCPResponse | MCPNotification
          this.handleMessage(parsed)
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  // Handle parsed message
  private handleMessage(msg: MCPResponse | MCPNotification): void {
    if ('id' in msg) {
      // It's a response to a request
      const pending = this.pendingRequests.get(msg.id)
      if (pending) {
        this.pendingRequests.delete(msg.id)
        pending.resolve(msg)
      }
    }
    // Notifications are handled by listeners
    this.emit('notification', msg)
  }

  // Send a request
  async sendRequest(method: string, params?: Record<string, unknown>): Promise<MCPResponse> {
    const id = ++this.requestId
    const request: MCPRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      if (this.process) {
        this.process.stdin.write(JSON.stringify(request) + '\n')
      } else {
        reject(new Error('Process not connected'))
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request ${method} timed out`))
        }
      }, 30000)
    })
  }

  // Send a notification (no response expected)
  sendNotification(method: string, params?: Record<string, unknown>): void {
    const notification: MCPNotification = {
      jsonrpc: '2.0',
      method,
      params,
    }

    if (this.process) {
      this.process.stdin.write(JSON.stringify(notification) + '\n')
    }
  }

  // Handle disconnect
  private handleDisconnect(): void {
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Connection closed'))
    })
    this.pendingRequests.clear()
    this.emit('disconnect')
  }

  // Stop the process
  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }

  // Event emitter methods
  private emitter = new EventEmitter()
  on(event: string, listener: (...args: unknown[]) => void): void {
    this.emitter.on(event, listener)
  }
  off(event: string, listener: (...args: unknown[]) => void): void {
    this.emitter.off(event, listener)
  }
  emit(event: string, ...args: unknown[]): void {
    this.emitter.emit(event, ...args)
  }
}

// MCP Client
export class MCPClient {
  private transport: MCPTransport | null = null
  private serverName = ''
  private serverVersion = ''
  private tools: MCPTool[] = []
  private resources: MCPResource[] = []
  private status: MCPServerStatus = 'disconnected'

  // Events
  private emitter = new EventEmitter()
  onStatusChange(status: MCPServerStatus): void {
    this.emitter.on('status', listener)
  }
  private emitStatusChange(status: MCPServerStatus): void {
    this.status = status
    this.emitter.emit('status', status)
  }

  async connect(config: {
    command?: string
    args?: string[]
    env?: Record<string, string>
    name?: string
    version?: string
    transport?: 'stdio' | 'sse'
    url?: string
    headers?: Record<string, string>
  }): Promise<void> {
    this.serverName = config.name || 'MCP Server'
    this.serverVersion = config.version || '1.0.0'
    this.emitStatusChange('connecting')

    // Create transport based on config
    if (config.transport === 'sse' && config.url) {
      // Use SSE transport
      const { SSETransport } = await import('./sseTransport.js')
      this.transport = new SSETransport(config.url, config.headers || {})
    } else if (config.command) {
      // Default to stdio transport
      this.transport = new StdioTransport(config.command, config.args || [], config.env || {})
    } else {
      throw new Error('Either command (for stdio) or url (for SSE) must be provided')
    }

    // Set up transport event listeners
    this.transport.on('notification', (msg) => {
      this.emitter.emit('notification', msg)
    })
    this.transport.on('disconnect', () => {
      this.emitStatusChange('disconnected')
    })
    this.transport.on('error', (error) => {
      this.emitter.emit('error', error)
      this.emitStatusChange('error')
    })

    try {
      await this.transport.start()
      this.emitStatusChange('connected')

      // Initialize - send initialize request
      const response = await this.transport.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'qoocode',
          version: '0.1.4',
        },
      })

      if (response.result) {
        const result = response.result as {
          serverInfo?: { name: string; version: string }
          capabilities?: Record<string, unknown>
        }
        this.serverName = result.serverInfo?.name || this.serverName
        this.serverVersion = result.serverInfo?.version || this.serverVersion
      }

      // Notify server that we're ready
      this.transport.sendNotification('initialized')

      // Fetch tools and resources
      await this.fetchTools()
      await this.fetchResources()
    } catch (error) {
      this.emitStatusChange('error')
      throw error
    }
  }

  async fetchTools(): Promise<MCPTool[]> {
    if (!this.transport) return []

    try {
      const response = await this.transport.sendRequest('tools/list')
      if (response.result) {
        const result = response.result as { tools: MCPTool[] }
        this.tools = result.tools || []
      }
    } catch {
      // Ignore errors
    }

    return this.tools
  }

  async fetchResources(): Promise<MCPResource[]> {
    if (!this.transport) return []

    try {
      const response = await this.transport.sendRequest('resources/list')
      if (response.result) {
        const result = response.result as { resources: MCPResource[] }
        this.resources = result.resources || []
      }
    } catch {
      // Ignore errors
    }

    return this.resources
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.transport) {
      throw new Error('Not connected')
    }

    const response = await this.transport.sendRequest('tools/call', {
      name,
      arguments: args,
    })

    if (response.error) {
      throw new Error(`MCP Error: ${response.error.message}`)
    }

    return response.result
  }

  async readResource(uri: string): Promise<unknown> {
    if (!this.transport) {
      throw new Error('Not connected')
    }

    const response = await this.transport.sendRequest('resources/read', {
      uri,
    })

    if (response.error) {
      throw new Error(`MCP Error: ${response.error.message}`)
    }

    return response.result
  }

  disconnect(): void {
    if (this.transport) {
      this.transport.stop()
      this.transport = null
    }
    this.emitStatusChange('disconnected')
  }

  getTools(): MCPTool[] {
    return this.tools
  }

  getResources(): MCPResource[] {
    return this.resources
  }

  getStatus(): MCPServerStatus {
    return this.status
  }

  getServerInfo(): { name: string; version: string } {
    return { name: this.serverName, version: this.serverVersion }
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    this.emitter.on(event, listener)
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.emitter.off(event, listener)
  }
}

// MCP Server manager
class MCPServerManager {
  private servers = new Map<string, MCPClient>()

  async addServer(config: {
    id: string
    name: string
    command?: string
    args?: string[]
    env?: Record<string, string>
    transport?: 'stdio' | 'sse'
    url?: string
    headers?: Record<string, string>
  }): Promise<void> {
    const client = new MCPClient()
    await client.connect({
      command: config.command,
      args: config.args,
      env: config.env,
      name: config.name,
      transport: config.transport || 'stdio',
      url: config.url,
      headers: config.headers,
    })
    this.servers.set(config.id, client)
  }

  removeServer(id: string): void {
    const client = this.servers.get(id)
    if (client) {
      client.disconnect()
      this.servers.delete(id)
    }
  }

  getServer(id: string): MCPClient | undefined {
    return this.servers.get(id)
  }

  getAllServers(): Map<string, MCPClient> {
    return this.servers
  }

  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = []
    for (const client of this.servers.values()) {
      allTools.push(...client.getTools())
    }
    return allTools
  }
}

let mcpManager: MCPServerManager | null = null

export function getMCPManager(): MCPServerManager {
  if (!mcpManager) {
    mcpManager = new MCPServerManager()
  }
  return mcpManager
}