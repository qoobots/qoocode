/**
 * /rewind - Go back to a previous state in the conversation
 */
import type { Command } from '../../types/message.js'

export const rewindCmd: Command = {
  name: 'rewind',
  aliases: ['rw'],
  description: 'Go back to a previous point in the conversation',
  type: 'local',
  execute(args: string) {
    // Parse the number of messages to rewind
    const count = parseInt(args.trim())
    
    if (isNaN(count) || count <= 0) {
      return `  Rewind Command
  
  Usage: /rewind <count>
  
  Go back to a previous point in the conversation.
  
  Options:
    count  - Number of messages to go back (default: 1)
  
  Examples:
    /rewind          - Go back 1 message
    /rewind 3        - Go back 3 messages
    /rewind all      - Go back to the beginning
  
  Note: This removes the last N messages from the conversation history.
  The removed messages are not lost - they're stored for reference.
  
  Use /resume to restore a previous state.`
    }
    
    if (args.trim().toLowerCase() === 'all') {
      return '__REWIND_ALL__'
    }
    
    return `__REWIND__:${count}`
  },
}

export default rewindCmd
