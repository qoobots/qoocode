/**
 * Session Manager - Manages conversation history and rewind functionality
 */
import type { Message } from '../../types/message.js'

interface MessageSnapshot {
  id: string
  messages: Message[]
  timestamp: number
  description?: string
}

class SessionManager {
  private messageSnapshots: MessageSnapshot[] = []
  private maxSnapshots = 50
  
  /**
   * Create a snapshot of the current messages
   */
  createSnapshot(messages: Message[], description?: string): string {
    const id = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    
    const snapshot: MessageSnapshot = {
      id,
      messages: [...messages], // Deep copy
      timestamp: Date.now(),
      description,
    }
    
    this.messageSnapshots.push(snapshot)
    
    // Limit stored snapshots
    if (this.messageSnapshots.length > this.maxSnapshots) {
      this.messageSnapshots = this.messageSnapshots.slice(-this.maxSnapshots)
    }
    
    return id
  }
  
  /**
   * Get all snapshots
   */
  getSnapshots(): Array<{
    id: string
    timestamp: number
    description?: string
    messageCount: number
  }> {
    return this.messageSnapshots.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      description: s.description,
      messageCount: s.messages.length,
    }))
  }
  
  /**
   * Get a snapshot by ID
   */
  getSnapshot(id: string): MessageSnapshot | null {
    return this.messageSnapshots.find(s => s.id === id) || null
  }
  
  /**
   * Restore a snapshot
   */
  restoreSnapshot(id: string): Message[] | null {
    const snapshot = this.getSnapshot(id)
    if (snapshot) {
      return [...snapshot.messages] // Return a copy
    }
    return null
  }
  
  /**
   * Remove messages from the end
   */
  removeLastMessages(messages: Message[], count: number): Message[] {
    // Create snapshot before removing
    this.createSnapshot(messages, `Before removing ${count} message(s)`)
    
    // Remove the last 'count' messages
    return messages.slice(0, -count)
  }
  
  /**
   * Remove all messages
   */
  clearAllMessages(messages: Message[]): Message[] {
    // Create snapshot before clearing
    this.createSnapshot(messages, 'Before clearing all')
    
    // Keep only system message if present
    return messages.filter(m => m.role === 'system')
  }
  
  /**
   * Get snapshot history
   */
  getSnapshotHistory(): Array<{
    id: string
    timestamp: Date
    messageCount: number
    description?: string
  }> {
    return this.messageSnapshots.map(s => ({
      id: s.id,
      timestamp: new Date(s.timestamp),
      messageCount: s.messages.length,
      description: s.description,
    }))
  }
  
  /**
   * Delete a snapshot
   */
  deleteSnapshot(id: string): boolean {
    const index = this.messageSnapshots.findIndex(s => s.id === id)
    if (index !== -1) {
      this.messageSnapshots.splice(index, 1)
      return true
    }
    return false
  }
  
  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.messageSnapshots = []
  }
}

// Singleton instance
let sessionManager: SessionManager | null = null

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager()
  }
  return sessionManager
}

export type { MessageSnapshot }
export default SessionManager
