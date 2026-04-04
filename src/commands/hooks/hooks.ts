/**
 * /hooks - Manage hooks for automated actions
 */
import type { Command } from '../../types/message.js'
import { getHooksManager, type HookEvent, type Hook, type ToolMatcher } from '../../services/hooks/hooksService.js'

const VALID_EVENTS: HookEvent[] = ['PreToolUse', 'PostToolUse', 'Stop', 'PreToolUseCommand', 'PostToolUseCommand']
const TOOL_MATCHERS = ['Write', 'Edit', 'Read', 'Bash', 'Grep', 'Glob']

export const hooksCmd: Command = {
  name: 'hooks',
  aliases: ['hook'],
  description: 'Manage hooks for automated actions',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()
    const hookManager = getHooksManager()
    
    // Show help
    if (!subcommand || subcommand === 'help') {
      return `  Hooks Management
  
  Hooks run commands automatically before/after tool use.
  
  Usage: /hooks <command> [options]
  
  Commands:
    /hooks list              - List all hooks
    /hooks add <hook>       - Add a new hook
    /hooks remove <id>      - Remove a hook
    /hooks enable <id>      - Enable a hook
    /hooks disable <id>      - Disable a hook
  
  Hook Events:
    PreToolUse       - Run before a tool is used
    PostToolUse      - Run after a tool completes
    Stop             - Run at the end of each turn
    PreToolUseCommand - Run before a specific command
  
  Tool Matchers:
    Write, Edit, Read, Bash, Grep, Glob, or specific tool name
  
  Examples:
    /hooks add PreToolUse Write "npm run lint"
    /hooks add PostToolUse Edit "npm run format"
    /hooks add Stop "*" "echo 'Turn complete'"
  
  Hooks are stored in:
    Project: .QOOCODE/settings.json
    Personal: ~/.QOOCODE/settings.local.json`
    }
    
    // List hooks
    if (subcommand === 'list' || subcommand === 'ls') {
      const hooks = await hookManager.getAllHooks()
      
      if (hooks.length === 0) {
        return 'No hooks configured.\n\nUse /hooks add to create a hook.'
      }
      
      const lines = ['Configured Hooks:']
      for (const hook of hooks) {
        const status = hook.enabled ? '✓' : '✗'
        const source = hook.source === 'project' ? '(project)' : '(personal)'
        lines.push(`\n${status} ${hook.id.slice(0, 16)}... ${source}`)
        lines.push(`   Event: ${hook.event}`)
        if (hook.matcher) {
          lines.push(`   Matcher: ${Array.isArray(hook.matcher) ? hook.matcher.join(', ') : hook.matcher}`)
        }
        lines.push(`   Command: ${hook.command}`)
        if (hook.description) {
          lines.push(`   ${hook.description}`)
        }
      }
      
      return lines.join('\n')
    }
    
    // Add hook
    if (subcommand === 'add' || subcommand === 'create') {
      const event = parts[1]?.toLowerCase() as HookEvent | undefined
      const matcher = parts[2]
      const command = parts.slice(3).join(' ')
      
      // Validate event
      if (!event || !VALID_EVENTS.map(e => e.toLowerCase()).includes(event)) {
        return `Invalid event. Valid events: ${VALID_EVENTS.join(', ')}`
      }
      
      // Validate command
      const validation = hookManager.validateHookCommand(command)
      if (!validation.valid) {
        return `Invalid command: ${validation.error}`
      }
      
      const hook = await hookManager.addHook({
        event: event.charAt(0).toUpperCase() + event.slice(1) as HookEvent,
        matcher: matcher as ToolMatcher | undefined,
        command,
        enabled: true,
        source: 'project',
      })
      
      return `Hook added successfully!\nID: ${hook.id}\nEvent: ${hook.event}\nCommand: ${hook.command}`
    }
    
    // Remove hook
    if (subcommand === 'remove' || subcommand === 'rm' || subcommand === 'delete') {
      const id = parts[1]
      
      if (!id) {
        return 'Usage: /hooks remove <hook-id>'
      }
      
      const success = await hookManager.removeHook(id)
      
      if (success) {
        return `Hook ${id.slice(0, 16)}... removed`
      }
      
      return `Hook not found: ${id}`
    }
    
    // Enable hook
    if (subcommand === 'enable') {
      const id = parts[1]
      
      if (!id) {
        return 'Usage: /hooks enable <hook-id>'
      }
      
      const hook = await hookManager.updateHook(id, { enabled: true })
      
      if (hook) {
        return `Hook enabled: ${hook.id.slice(0, 16)}...`
      }
      
      return `Hook not found: ${id}`
    }
    
    // Disable hook
    if (subcommand === 'disable') {
      const id = parts[1]
      
      if (!id) {
        return 'Usage: /hooks disable <hook-id>'
      }
      
      const hook = await hookManager.updateHook(id, { enabled: false })
      
      if (hook) {
        return `Hook disabled: ${hook.id.slice(0, 16)}...`
      }
      
      return `Hook not found: ${id}`
    }
    
    // Show hook details
    if (subcommand === 'show' || subcommand === 'info') {
      const id = parts[1]
      
      if (!id) {
        return 'Usage: /hooks show <hook-id>'
      }
      
      const hooks = await hookManager.getAllHooks()
      const hook = hooks.find(h => h.id === id)
      
      if (!hook) {
        return `Hook not found: ${id}`
      }
      
      return `Hook Details:
  ID: ${hook.id}
  Event: ${hook.event}
  Matcher: ${hook.matcher || '(any)'}
  Command: ${hook.command}
  Status: ${hook.enabled ? 'Enabled' : 'Disabled'}
  Source: ${hook.source}
  Description: ${hook.description || '(none)'}`
    }
    
    return `Unknown hook command: ${subcommand}\n\nUse /hooks help for available commands`
  },
}

export default hooksCmd
