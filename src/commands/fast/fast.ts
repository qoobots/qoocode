/**
 * /fast - Toggle fast mode for faster responses
 */
import type { Command } from '../../types/message.js'

export const fastCmd: Command = {
  name: 'fast',
  aliases: ['fast-mode'],
  description: 'Toggle fast mode for faster responses',
  type: 'local',
  execute(args: string) {
    const arg = args.trim().toLowerCase()
    
    // Show help
    if (arg === 'help') {
      return `  Fast Mode
  
  Usage: /fast [on|off]
  
  Toggle fast mode for faster, higher-priority responses.
  
  Fast mode uses a faster model tier for quicker responses.
  Note: Fast mode may use more tokens and cost more.
  
  Examples:
    /fast       - Toggle fast mode
    /fast on    - Enable fast mode
    /fast off   - Disable fast mode
  
  Fast mode is useful when you need quick responses
  and want to trade off some quality for speed.`
    }
    
    // Toggle or set fast mode
    if (arg === 'on') {
      return '__FAST_MODE__:on'
    }
    
    if (arg === 'off') {
      return '__FAST_MODE__:off'
    }
    
    // Toggle (show current status)
    return '__FAST_MODE__:toggle'
  },
}

export default fastCmd
