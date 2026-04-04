/**
 * Ultraplan Remote Session Service
 * 
 * Provides remote session management for ultraplan multi-agent planning.
 * Supports Tmux and iTerm2 backend integration.
 */

import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export interface RemoteSessionConfig {
  backend: 'tmux' | 'iterm2'
  sessionName: string
  workingDirectory?: string
  environment?: Record<string, string>
  size?: { width: number; height: number }
}

export interface RemoteSession {
  id: string
  config: RemoteSessionConfig
  status: 'pending' | 'active' | 'disconnected' | 'error'
  createdAt: Date
  processId?: number
  socketPath?: string
}

export interface SessionMessage {
  type: 'output' | 'input' | 'resize' | 'status' | 'error'
  sessionId: string
  data: string | { width: number; height: number } | RemoteSession['status']
  timestamp: Date
}

class RemoteSessionService extends EventEmitter {
  private sessions: Map<string, RemoteSession> = new Map()
  private processes: Map<string, ChildProcess> = new Map()
  private messageQueue: Map<string, SessionMessage[]> = new Map()

  /**
   * Create a new remote session
   */
  async createSession(config: RemoteSessionConfig): Promise<RemoteSession> {
    const sessionId = this.generateSessionId()
    
    const session: RemoteSession = {
      id: sessionId,
      config,
      status: 'pending',
      createdAt: new Date(),
    }

    this.sessions.set(sessionId, session)
    this.messageQueue.set(sessionId, [])

    try {
      await this.initializeBackend(session)
      session.status = 'active'
      this.sessions.set(sessionId, session)
      
      this.emit('session:created', session)
      this.emitMessage({
        type: 'status',
        sessionId,
        data: 'active',
        timestamp: new Date(),
      })

      return session
    } catch (error) {
      session.status = 'error'
      this.sessions.set(sessionId, session)
      
      this.emitMessage({
        type: 'error',
        sessionId,
        data: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      })
      
      throw error
    }
  }

  /**
   * Initialize the backend (tmux or iterm2)
   */
  private async initializeBackend(session: RemoteSession): Promise<void> {
    const { config } = session

    if (config.backend === 'tmux') {
      await this.initializeTmux(session)
    } else if (config.backend === 'iterm2') {
      await this.initializeITerm2(session)
    }
  }

  /**
   * Initialize Tmux session
   */
  private async initializeTmux(session: RemoteSession): Promise<void> {
    const { config, id } = session
    
    // Create tmux session
    const sessionName = config.sessionName || `QOOCODE-${id}`
    const socketPath = `/tmp/QOOCODE-${id}.sock`

    // Create new tmux session with socket
    await this.execCommand('tmux', [
      '-L', `QOOCODE-${id}`,
      'new-session',
      '-d',
      '-s', sessionName,
      '-c', config.workingDirectory || process.cwd(),
    ])

    // Set window size if specified
    if (config.size) {
      await this.execCommand('tmux', [
        '-L', `QOOCODE-${id}`,
        'resize-window',
        '-t', sessionName,
        '-x', config.size.width.toString(),
        '-y', config.size.height.toString(),
      ])
    }

    session.socketPath = socketPath
    session.processId = await this.getTmuxPid(sessionName)
  }

  /**
   * Initialize iTerm2 session
   */
  private async initializeITerm2(session: RemoteSession): Promise<void> {
    // iTerm2 requires AppleScript or proprietary integration
    // For now, we'll use a simplified approach
    const { config, id } = session
    
    const scriptPath = `/tmp/QOOCODE-iterm-${id}.sh`
    const script = `#!/bin/bash
osascript -e 'tell application "iTerm2"
  activate
  create window with default profile
  tell current session of current window
    write text "cd ${config.workingDirectory || process.cwd()}"
  end tell
end tell'`

    fs.writeFileSync(scriptPath, script)
    fs.chmodSync(scriptPath, '755')

    const proc = spawn('/bin/bash', [scriptPath], {
      env: { ...process.env, ...config.environment },
      detached: true,
    })

    session.processId = proc.pid
    this.processes.set(id, proc)
  }

  /**
   * Send input to session
   */
  async sendInput(sessionId: string, input: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    if (session.status !== 'active') {
      throw new Error(`Session ${sessionId} is not active`)
    }

    const { config } = session

    if (config.backend === 'tmux') {
      await this.execCommand('tmux', [
        '-L', `QOOCODE-${sessionId}`,
        'send-keys',
        '-t', config.sessionName,
        input,
        'Enter',
      ])
    }

    this.emitMessage({
      type: 'input',
      sessionId,
      data: input,
      timestamp: new Date(),
    })
  }

  /**
   * Resize session window
   */
  async resizeSession(sessionId: string, width: number, height: number): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const { config } = session

    if (config.backend === 'tmux') {
      await this.execCommand('tmux', [
        '-L', `QOOCODE-${sessionId}`,
        'resize-window',
        '-t', config.sessionName,
        '-x', width.toString(),
        '-y', height.toString(),
      ])
    }

    this.emitMessage({
      type: 'resize',
      sessionId,
      data: { width, height },
      timestamp: new Date(),
    })
  }

  /**
   * Capture session output
   */
  async captureOutput(sessionId: string, lines: number = 100): Promise<string> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const { config } = session

    if (config.backend === 'tmux') {
      const output = await this.execCommand('tmux', [
        '-L', `QOOCODE-${sessionId}`,
        'capture-pane',
        '-t', config.sessionName,
        '-p',
        '-S', `-${lines}`,
      ])
      return output
    }

    return ''
  }

  /**
   * Attach to session (get continuous output)
   */
  async attachSession(sessionId: string): Promise<AsyncGenerator<string>> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const { config } = session

    if (config.backend === 'tmux') {
      const proc = spawn('tmux', [
        '-L', `QOOCODE-${sessionId}`,
        'pipe-pane',
        '-t', config.sessionName,
        'cat',
      ])

      this.processes.set(`${sessionId}-pipe`, proc)

      const self = this
      return (async function* () {
        for await (const chunk of proc.stdout!) {
          const line = chunk.toString()
          self.emitMessage({
            type: 'output',
            sessionId,
            data: line,
            timestamp: new Date(),
          })
          yield line
        }
      })()
    }

    return (async function* () {})()
  }

  /**
   * Disconnect from session
   */
  async disconnectSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return
    }

    session.status = 'disconnected'
    this.sessions.set(sessionId, session)

    // Stop any attached processes
    const proc = this.processes.get(sessionId)
    if (proc) {
      proc.kill()
      this.processes.delete(sessionId)
    }

    const pipeProc = this.processes.get(`${sessionId}-pipe`)
    if (pipeProc) {
      pipeProc.kill()
      this.processes.delete(`${sessionId}-pipe`)
    }

    this.emitMessage({
      type: 'status',
      sessionId,
      data: 'disconnected',
      timestamp: new Date(),
    })
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.disconnectSession(sessionId)

    const session = this.sessions.get(sessionId)
    if (!session) {
      return
    }

    const { config } = session

    if (config.backend === 'tmux') {
      await this.execCommand('tmux', [
        '-L', `QOOCODE-${sessionId}`,
        'kill-session',
        '-t', config.sessionName,
      ]).catch(() => {}) // Ignore errors if session already gone
    }

    this.sessions.delete(sessionId)
    this.messageQueue.delete(sessionId)

    this.emit('session:deleted', sessionId)
  }

  /**
   * List all sessions
   */
  listSessions(): RemoteSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): RemoteSession | undefined {
    return this.sessions.get(sessionId)
  }

  /**
   * Get queued messages for a session
   */
  getMessages(sessionId: string): SessionMessage[] {
    return this.messageQueue.get(sessionId) || []
  }

  /**
   * Clear queued messages for a session
   */
  clearMessages(sessionId: string): void {
    this.messageQueue.set(sessionId, [])
  }

  /**
   * Execute a command
   */
  private execCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args)
      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      proc.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve(stdout)
        } else {
          reject(new Error(stderr || `Command exited with code ${code}`))
        }
      })

      proc.on('error', reject)
    })
  }

  /**
   * Get tmux session PID
   */
  private async getTmuxPid(sessionName: string): Promise<number | undefined> {
    try {
      const output = await this.execCommand('tmux', [
        'display-message',
        '-p',
        '#{session_pid}',
      ])
      return parseInt(output.trim(), 10) || undefined
    } catch {
      return undefined
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Emit message event
   */
  private emitMessage(message: SessionMessage): void {
    const queue = this.messageQueue.get(message.sessionId) || []
    queue.push(message)
    this.messageQueue.set(message.sessionId, queue)
    this.emit('message', message)
  }
}

// Singleton instance
let remoteSessionService: RemoteSessionService | null = null

export function getRemoteSessionService(): RemoteSessionService {
  if (!remoteSessionService) {
    remoteSessionService = new RemoteSessionService()
  }
  return remoteSessionService
}

// Convenience functions
export async function createRemoteSession(config: RemoteSessionConfig): Promise<RemoteSession> {
  return getRemoteSessionService().createSession(config)
}

export async function sendToSession(sessionId: string, input: string): Promise<void> {
  return getRemoteSessionService().sendInput(sessionId, input)
}

export async function resizeSession(sessionId: string, width: number, height: number): Promise<void> {
  return getRemoteSessionService().resizeSession(sessionId, width, height)
}

export async function captureSessionOutput(sessionId: string, lines?: number): Promise<string> {
  return getRemoteSessionService().captureOutput(sessionId, lines)
}

export async function attachToSession(sessionId: string): Promise<AsyncGenerator<string>> {
  return getRemoteSessionService().attachSession(sessionId)
}

export async function disconnectSession(sessionId: string): Promise<void> {
  return getRemoteSessionService().disconnectSession(sessionId)
}

export async function deleteRemoteSession(sessionId: string): Promise<void> {
  return getRemoteSessionService().deleteSession(sessionId)
}

export function listRemoteSessions(): RemoteSession[] {
  return getRemoteSessionService().listSessions()
}

export function getRemoteSession(sessionId: string): RemoteSession | undefined {
  return getRemoteSessionService().getSession(sessionId)
}

export function getSessionMessages(sessionId: string): SessionMessage[] {
  return getRemoteSessionService().getMessages(sessionId)
}

export function clearSessionMessages(sessionId: string): void {
  return getRemoteSessionService().clearMessages(sessionId)
}
