// MCP SSE Transport - Server-Sent Events transport for MCP protocol
import { EventEmitter } from 'node:events'
import { createParser } from 'eventsource-parser'

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

// SSE Transport for MCP
export class SSETransport extends EventEmitter {
  private requestId = 0
  private pendingRequests = new Map<number | string, { resolve: (value: MCPResponse) => void; reject: (error: Error) => void }>()
  private connected = false
  private abortController: AbortController | null = null

  constructor(
    private url: string,
    private headers: Record<string, string> = {},
  ) {
    super()
  }

  // Start the SSE connection
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.abortController = new AbortController()

      // Send initial POST request to establish connection
      fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...this.headers,
        },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', params: {} }),
        signal: this.abortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          this.connected = true
          this.emit('connect')

          // Set up SSE parser
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          const parser = createParser({
            onEvent: (event) => {
              this.handleSSEMessage(event)
            },
            onError: (error) => {
              this.emit('error', error)
            },
          })

          const processStream = () => {
            if (!reader) return

            reader.read().then(({ done, value }) => {
              if (done) {
                this.handleDisconnect()
                return
              }

              const chunk = decoder.decode(value, { stream: true })
              parser.feed(chunk)
              processStream()
            }).catch((error) => {
              this.handleError(error)
            })
          }

          processStream()
          resolve()
        })
        .catch((error) => {
          this.handleError(error)
          reject(error)
        })

      // Timeout after 30 seconds for connection
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'))
        }
      }, 30000)
    })
  }

  // Handle incoming SSE message
  private handleSSEMessage(event: { data?: string; type?: string }): void {
    const eventType = event.type || 'message'
    
    if (eventType === 'error' || eventType === 'failure') {
      this.emit('error', new Error(event.data || 'Unknown error'))
      return
    }

    if (event.data) {
      try {
        // SSE can send multiple JSON objects separated by newlines
        const lines = event.data.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue
          
          const parsed = JSON.parse(line) as MCPResponse | MCPNotification
          
          if ('id' in parsed) {
            // Response to a request
            const pending = this.pendingRequests.get(parsed.id)
            if (pending) {
              this.pendingRequests.delete(parsed.id)
              pending.resolve(parsed)
            }
          }
          
          // Emit notification
          this.emit('notification', parsed)
        }
      } catch {
        // Ignore parse errors
      }
    }
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

      // Send via EventSource POST channel or SSE comment channel
      this.sendSSEMessage(request)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request ${method} timed out`))
        }
      }, 30000)
    })
  }

  // Send a notification
  sendNotification(method: string, params?: Record<string, unknown>): void {
    const notification: MCPNotification = {
      jsonrpc: '2.0',
      method,
      params,
    }
    this.sendSSEMessage(notification)
  }

  // Send message via SSE
  private sendSSEMessage(message: MCPRequest | MCPNotification): void {
    if (!this.connected) {
      throw new Error('Not connected')
    }

    // In SSE transport, we send messages as SSE comments
    // The format is: :<json>\n\n
    const sseData = `data: ${JSON.stringify(message)}\n\n`
    
    // For POST-based SSE, we'd need a separate channel
    // For now, emit the message for the transport layer to handle
    this.emit('send', sseData)
  }

  // Handle disconnect
  private handleDisconnect(): void {
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Connection closed'))
    })
    this.pendingRequests.clear()
    this.connected = false
    this.emit('disconnect')
  }

  // Handle error
  private handleError(error: Error): void {
    this.emit('error', error)
    this.handleDisconnect()
  }

  // Stop the transport
  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.handleDisconnect()
  }

  // Check if connected
  isConnected(): boolean {
    return this.connected
  }
}

// Alternative SSE transport using WebSocket-like mechanism
export class SSEStreamTransport extends EventEmitter {
  private requestId = 0
  private pendingRequests = new Map<number | string, { resolve: (value: MCPResponse) => void; reject: (error: Error) => void }>()
  private connected = false
  private messageBuffer = ''
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private abortController: AbortController | null = null

  constructor(
    private endpoint: string,
    private headers: Record<string, string> = {},
  ) {
    super()
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.abortController = new AbortController()

      // Connect to SSE endpoint
      fetch(this.endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          ...this.headers,
        },
        signal: this.abortController.signal,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          this.connected = true
          this.emit('connect')

          // Set up SSE parser
          this.reader = response.body?.getReader() || null
          const decoder = new TextDecoder()

          const processStream = () => {
            if (!this.reader) return

            this.reader.read().then(({ done, value }) => {
              if (done) {
                this.handleDisconnect()
                return
              }

              const chunk = decoder.decode(value, { stream: true })
              this.handleData(chunk)
              processStream()
            }).catch((error) => {
              this.handleError(error)
            })
          }

          processStream()
          resolve()
        })
        .catch((error) => {
          this.handleError(error)
          reject(error)
        })

      // Timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'))
        }
      }, 30000)
    })
  }

  // Handle incoming data
  private handleData(data: string): void {
    this.messageBuffer += data

    // Parse SSE messages
    const lines = this.messageBuffer.split('\n')
    this.messageBuffer = lines.pop() || ''

    let eventType = 'message'
    
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim()
        continue
      }

      if (line.startsWith('data:')) {
        const dataContent = line.slice(5).trim()
        if (dataContent) {
          try {
            const parsed = JSON.parse(dataContent) as MCPResponse | MCPNotification
            
            if ('id' in parsed) {
              const pending = this.pendingRequests.get(parsed.id)
              if (pending) {
                this.pendingRequests.delete(parsed.id)
                pending.resolve(parsed)
              }
            }
            
            this.emit('notification', parsed)
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

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

      // For SSE stream transport, we use a POST endpoint
      fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify(request),
      }).catch((error) => {
        this.pendingRequests.delete(id)
        reject(error)
      })

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request ${method} timed out`))
        }
      }, 30000)
    })
  }

  sendNotification(method: string, params?: Record<string, unknown>): void {
    const notification: MCPNotification = {
      jsonrpc: '2.0',
      method,
      params,
    }

    // Send via POST
    fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(notification),
    }).catch(() => {
      // Ignore send errors for notifications
    })
  }

  private handleDisconnect(): void {
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('Connection closed'))
    })
    this.pendingRequests.clear()
    this.connected = false
    this.emit('disconnect')
  }

  private handleError(error: Error): void {
    this.emit('error', error)
    this.handleDisconnect()
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this.reader) {
      this.reader.cancel()
      this.reader = null
    }
    this.handleDisconnect()
  }

  isConnected(): boolean {
    return this.connected
  }
}

export type MCPTansportType = 'stdio' | 'sse' | 'sse-stream'

export interface TransportConfig {
  type: MCPTansportType
  // Stdio config
  command?: string
  args?: string[]
  env?: Record<string, string>
  // SSE config
  url?: string
  headers?: Record<string, string>
}
