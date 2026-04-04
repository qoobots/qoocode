import type { Command } from '../types/message.js'
import { runDiagnostics, formatDiagnostics, getDiagnosticsSummary } from './services/doctor/doctorService.js'
import { 
  getCurrentPermissionLevel, 
  setPermissionLevel, 
  getPermissionInfo, 
  getAllPermissionLevels,
  getPermissionStatus,
  isValidPermissionMode,
  PERMISSIONS_HELP,
  type PermissionLevel
} from './services/permissions/permissionCommands.js'
import { 
  compressContext, 
  formatCompressionStats, 
  previewCompression,
  type CompressionStats 
} from './services/compact/compactService.js'
import { getSessionManager } from './services/session/sessionManager.js'
// Import external commands
import { prCommentsCmd } from './commands/pr_comments/index.js'
import { rewindCmd } from './commands/rewind/rewind.js'
import { fastCmd } from './commands/fast/fast.js'
import { hooksCmd } from './commands/hooks/hooks.js'
import { upgradeCmd } from './commands/upgrade/upgrade.js'
// Import desktop and mobile services
import { 
  executeDesktopCommand, 
  type DesktopInput,
  getDesktopStatus,
} from './services/desktop/desktopService.js'
import { 
  executeMobileCommand, 
  type MobileInput,
  getAvailablePlatforms,
} from './services/mobile/mobileService.js'
import { 
  getThemeManager, 
  setTheme, 
  toggleTheme,
  loadSavedTheme,
  validateThemeName,
  getAvailableThemes,
  formatThemeInfo,
  type ThemeName
} from './services/theme/themeService.js'
// Import hidden commands
import { executeBtwCommand } from './commands/btw/btw.js'
import { executeBughunterCommand } from './commands/bughunter/bughunter.js'
import { executeLoginCommand } from './commands/account/account.js'
import { executeHeapdumpCommand } from './commands/heapdump/heapdump.js'
import { executeMockLimitsCommand } from './commands/mock-limits/mockLimits.js'
import { chromeCmd } from './commands/chrome/chrome.js'
import { memory } from './commands/memory/memory.js'
import { cacheCmd } from './commands/cache/cache.js'
import {
  CURRENT_VERSION,
  checkForUpdates,
  performUpdate,
  getUpdateInfo,
  compareVersions,
  getVersionHistory,
} from './services/updater/updaterService.js'
import { getTeam, getAllTeams } from './tools/TeamCreateTool/TeamCreateTool.js'
// Import new commands
import { thinkbackCommand } from './commands/thinkback/thinkback.js'
import { thinkbackPlayCommand } from './commands/thinkback-play/thinkbackPlay.js'
import { insightsCommand } from './commands/insights/insights.js'
import ultraplanCommand from './commands/ultraplan/ultraplan.js'
import { speechCommand } from './commands/speech/speech.js'

const helpCmd: Command = {
  name: 'help',
  aliases: ['h', '?'],
  description: 'Show available commands',
  type: 'local',
  execute() {
    const commands = getCommands()
    const lines = [
      '',
      '  Available commands:',
      '',
      ...commands.map((cmd) => {
        const aliases = cmd.aliases?.length ? ` (${cmd.aliases.join(', ')})` : ''
        return `    /${cmd.name}${aliases}  —  ${cmd.description}`
      }),
      '',
      '  Use Ctrl+C to exit.',
      '',
    ]
    return lines.join('\n')
  },
}

const clearCmd: Command = {
  name: 'clear',
  aliases: ['cls'],
  description: 'Clear the conversation history',
  type: 'local',
  execute() {
    // This will be handled by the REPL component directly via dispatch
    return '__CLEAR_MESSAGES__'
  },
}

const exitCmd: Command = {
  name: 'exit',
  aliases: ['quit', 'q'],
  description: 'Exit QOOCODE',
  type: 'local',
  execute() {
    // This will be handled by the REPL component directly
    return '__EXIT__'
  },
}

const costCmd: Command = {
  name: 'cost',
  description: 'Show session cost and token usage',
  type: 'local',
  execute() {
    // This is handled by the REPL component directly via state
    return '__SHOW_COST__'
  },
}

const modelCmd: Command = {
  name: 'model',
  description: 'Show or change the current model',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return 'Current model: (will be shown in status bar)\nUsage: /model <model-name>\nExample: /model gpt-4o'
    }
    const newModel = args.trim()
    // Return special identifier for model change
    return `__CHANGE_MODEL__:${newModel}`
  },
}

const commitCmd: Command = {
  name: 'commit',
  aliases: ['ci'],
  description: 'Smart Git commit with staged changes',
  type: 'local',
  async execute(args: string) {
    // This would use BashTool to run git commands
    // For now, return instructions
    const message = args.trim() || 'feat: update'
    return `__GIT_COMMIT__:${message}`
  },
}

const reviewCmd: Command = {
  name: 'review',
  aliases: ['review-code'],
  description: 'Review code changes in git',
  type: 'local',
  execute(args: string) {
    return `__CODE_REVIEW__:${args}`
  },
}

const mcpCmd: Command = {
  name: 'mcp',
  description: 'MCP server management',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()
    const serverName = parts.slice(1).join(' ')
    
    // Dynamic import to avoid circular dependencies
    const { getMCPManager } = await import('./services/mcp/mcpClient.js')
    const manager = getMCPManager()
    
    // Show help
    if (!subcommand || subcommand === 'help') {
      return `  MCP Server Management
  
  Usage: /mcp <command> [options]
  
  Commands:
    /mcp list              - List all connected MCP servers
    /mcp add <config>      - Add a new MCP server (JSON config)
    /mcp remove <name>    - Remove an MCP server
    /mcp start <name>      - Start an MCP server
    /mcp stop <name>       - Stop an MCP server
    /mcp tools <name>      - List tools from a server
    /mcp resources <name>  - List resources from a server
    /mcp status            - Show connection status
  
  Example:
    /mcp list
    /mcp add '{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem"],"name":"filesystem"}'
    /mcp remove filesystem`
    }
    
    // List servers
    if (subcommand === 'list') {
      const servers = manager.getAllServers()
      if (servers.size === 0) {
        return 'No MCP servers connected.\n\nUse /mcp add <config> to connect a server.'
      }
      
      const lines = ['Connected MCP Servers:']
      for (const [id, client] of servers) {
        const info = client.getServerInfo()
        const tools = client.getTools()
        const resources = client.getResources()
        const status = client.getStatus()
        
        lines.push(`\n  ${info.name || id} (${status})`)
        lines.push(`    Tools: ${tools.length}`)
        lines.push(`    Resources: ${resources.length}`)
      }
      
      return lines.join('\n')
    }
    
    // Add server
    if (subcommand === 'add') {
      if (!serverName) {
        return `Usage: /mcp add <json-config>

Supported transports:
  - stdio: Local process-based MCP servers
  - sse: Remote MCP servers via Server-Sent Events

Examples:
  /mcp add '{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem"],"name":"filesystem"}'
  /mcp add '{"transport":"sse","url":"https://example.com/mcp","name":"remote-server"}'`
      }
      
      try {
        const config = JSON.parse(serverName)
        const id = config.name || `server-${Date.now()}`
        
        // Validate config
        if (config.transport === 'sse') {
          if (!config.url) {
            return 'Error: SSE transport requires "url" field'
          }
        } else if (!config.command) {
          return 'Error: Stdio transport requires "command" field'
        }
        
        await manager.addServer({
          id,
          name: config.name || 'MCP Server',
          command: config.command,
          args: config.args,
          env: config.env,
          transport: config.transport || 'stdio',
          url: config.url,
          headers: config.headers,
        })
        
        const client = manager.getServer(id)
        const tools = client?.getTools() || []
        const resources = client?.getResources() || []
        const transport = config.transport === 'sse' ? 'SSE' : 'stdio'
        
        return `Connected to ${config.name || id} (${transport})!\nTools: ${tools.length}\nResources: ${resources.length}`
      } catch (error) {
        return `Failed to add server: ${error instanceof Error ? error.message : String(error)}`
      }
    }
    
    // Remove server
    if (subcommand === 'remove' || subcommand === 'delete') {
      if (!serverName) {
        return 'Usage: /mcp remove <server-name>'
      }
      
      // Find server by name
      let found = false
      for (const [id, client] of manager.getAllServers()) {
        const info = client.getServerInfo()
        if (info.name === serverName || id === serverName) {
          manager.removeServer(id)
          found = true
          return `Removed MCP server: ${info.name || id}`
        }
      }
      
      return `Server "${serverName}" not found`
    }
    
    // Stop server
    if (subcommand === 'stop' || subcommand === 'disconnect') {
      if (!serverName) {
        return 'Usage: /mcp stop <server-name>'
      }
      
      for (const [id, client] of manager.getAllServers()) {
        const info = client.getServerInfo()
        if (info.name === serverName || id === serverName) {
          client.disconnect()
          return `Stopped MCP server: ${info.name || id}`
        }
      }
      
      return `Server "${serverName}" not found`
    }
    
    // Start server (reconnect)
    if (subcommand === 'start' || subcommand === 'connect') {
      return 'Use /mcp add to reconnect a server'
    }
    
    // List tools
    if (subcommand === 'tools') {
      if (!serverName) {
        // List all tools
        const allTools = manager.getAllTools()
        if (allTools.length === 0) {
          return 'No tools available from any server'
        }
        
        const lines = ['Available MCP Tools:']
        for (const tool of allTools) {
          lines.push(`  ${tool.name}: ${tool.description || 'no description'}`)
        }
        return lines.join('\n')
      }
      
      for (const [id, client] of manager.getAllServers()) {
        const info = client.getServerInfo()
        if (info.name === serverName || id === serverName) {
          const tools = client.getTools()
          if (tools.length === 0) {
            return `No tools available from ${info.name || id}`
          }
          
          const lines = [`Tools from ${info.name || id}:`]
          for (const tool of tools) {
            lines.push(`  ${tool.name}: ${tool.description || 'no description'}`)
          }
          return lines.join('\n')
        }
      }
      
      return `Server "${serverName}" not found`
    }
    
    // List resources
    if (subcommand === 'resources') {
      if (!serverName) {
        const lines = ['Available MCP Resources:']
        for (const [id, client] of manager.getAllServers()) {
          const info = client.getServerInfo()
          const resources = client.getResources()
          lines.push(`\n  ${info.name || id}:`)
          if (resources.length === 0) {
            lines.push('    (none)')
          } else {
            for (const r of resources) {
              lines.push(`    ${r.uri}: ${r.description || ''}`)
            }
          }
        }
        return lines.join('\n')
      }
      
      for (const [id, client] of manager.getAllServers()) {
        const info = client.getServerInfo()
        if (info.name === serverName || id === serverName) {
          const resources = client.getResources()
          if (resources.length === 0) {
            return `No resources available from ${info.name || id}`
          }
          
          const lines = [`Resources from ${info.name || id}:`]
          for (const r of resources) {
            lines.push(`  ${r.uri}`)
            if (r.description) lines.push(`    ${r.description}`)
          }
          return lines.join('\n')
        }
      }
      
      return `Server "${serverName}" not found`
    }
    
    // Status
    if (subcommand === 'status') {
      const servers = manager.getAllServers()
      if (servers.size === 0) {
        return 'MCP Status: No servers connected'
      }
      
      const lines = ['MCP Status:']
      for (const [id, client] of servers) {
        const info = client.getServerInfo()
        lines.push(`  ${info.name || id}: ${client.getStatus()}`)
      }
      return lines.join('\n')
    }
    
    return `Unknown MCP command: ${subcommand}\n\nUse /mcp help for available commands`
  },
}

const pluginCmd: Command = {
  name: 'plugin',
  aliases: ['plugins'],
  description: 'Manage QOOCODE plugins',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()
    const pluginName = parts.slice(1).join(' ')
    
    // Dynamic import to avoid circular dependencies
    const { getPluginManager } = await import('./services/plugin/pluginService.js')
    const manager = getPluginManager()
    
    // Show help
    if (!subcommand || subcommand === 'help') {
      return `  Plugin Management
  
  Usage: /plugin <command> [options]
  
  Commands:
    /plugin list           - List installed plugins
    /plugin install <pkg>  - Install a plugin from npm
    /plugin uninstall <pkg> - Uninstall a plugin
    /plugin reload         - Reload all plugins
    /plugin search <term>  - Search for plugins
  
  Example:
    /plugin list
    /plugin install @QOOCODE/plugin-example
    /plugin uninstall @QOOCODE/plugin-example`
    }
    
    // List plugins
    if (subcommand === 'list' || subcommand === 'ls') {
      const plugins = await manager.getInstalledPlugins()
      if (plugins.length === 0) {
        return 'No plugins installed.\n\nUse /plugin install <package> to install a plugin.'
      }
      
      const lines = ['Installed Plugins:']
      for (const plugin of plugins) {
        lines.push(`\n  ${plugin.name}@${plugin.version || 'unknown'}`)
        if (plugin.description) {
          lines.push(`    ${plugin.description}`)
        }
        lines.push(`    Installed: ${new Date(plugin.installedAt).toLocaleDateString()}`)
      }
      
      return lines.join('\n')
    }
    
    // Install plugin
    if (subcommand === 'install' || subcommand === 'add') {
      if (!pluginName) {
        return 'Usage: /plugin install <npm-package>\n\nExample: /plugin install @QOOCODE/plugin-example'
      }
      
      const result = await manager.installPlugin(pluginName)
      return result.message
    }
    
    // Uninstall plugin
    if (subcommand === 'uninstall' || subcommand === 'remove' || subcommand === 'rm') {
      if (!pluginName) {
        return 'Usage: /plugin uninstall <plugin-name>\n\nExample: /plugin uninstall @QOOCODE/plugin-example'
      }
      
      const result = await manager.uninstallPlugin(pluginName)
      return result.message
    }
    
    // Reload plugins
    if (subcommand === 'reload') {
      const result = await manager.reloadPlugins()
      return result.message
    }
    
    // Search plugins (basic npm search)
    if (subcommand === 'search') {
      if (!pluginName) {
        return 'Usage: /plugin search <search-term>\n\nExample: /plugin search QOOCODE'
      }
      
      return `Searching npm for "${pluginName}"...\n\nNote: For full search results, please use:\n  npm search ${pluginName}`
    }
    
    return `Unknown plugin command: ${subcommand}\n\nUse /plugin help for available commands`
  },
}

const planCmd: Command = {
  name: 'plan',
  description: 'Enter plan mode for complex tasks',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Usage: /plan <task-description>
  
  Plan mode helps you break down complex tasks into steps:
  1. Describe what you want to accomplish
  2. The AI will create a step-by-step plan
  3. You can review, modify, and execute the plan
  
  Example: /plan Create a user authentication system`
    }
    return `__ENTER_PLAN_MODE__:${args}`
  },
}

const sessionCmd: Command = {
  name: 'session',
  aliases: ['sessions'],
  description: 'Manage conversation sessions',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Session Commands:
    /session list     - List all saved sessions
    /session save    - Save current session
    /session load <id> - Load a session by ID
    /session delete <id> - Delete a session
    /session export <id> - Export session to JSON/MD`
    }
    return `__SESSION_COMMAND__:${args}`
  },
}

const skillsCmd: Command = {
  name: 'skills',
  aliases: ['skill'],
  description: 'Manage and use skills',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Skills Commands:
    /skills list     - List available skills
    /skills use <name> - Use a skill
    /skills install <url> - Install a new skill
    /skills uninstall <name> - Remove a skill
    /skills update <name> - Update a skill
    
  Skills are specialized capabilities that extend QOOCODE's functionality.`
    }
    return `__SKILLS_COMMAND__:${args}`
  },
}

const agentsCmd: Command = {
  name: 'agents',
  aliases: ['agent'],
  description: 'Manage AI agents',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Agent Commands:
    /agents list     - List active agents
    /agent start <type> - Start a new agent (explorer, reviewer, writer)
    /agent stop <id>  - Stop an agent
    /agent status <id> - Check agent status
    
  Agents are AI assistants that can work independently on tasks.`
    }
    return `__AGENTS_COMMAND__:${args}`
  },
}

const testCmd: Command = {
  name: 'test',
  description: 'Run tests in the project',
  type: 'local',
  execute(args: string) {
    return `__RUN_TESTS__:${args}`
  },
}

const workspaceCmd: Command = {
  name: 'workspace',
  aliases: ['ws'],
  description: 'Manage workspaces',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Workspace Commands:
    /workspace list     - List all workspaces
    /workspace add <path> - Add a workspace
    /workspace remove <name> - Remove a workspace
    /workspace switch <name> - Switch to another workspace
    
  Workspaces allow you to work on multiple projects.`
    }
    return `__WORKSPACE_COMMAND__:${args}`
  },
}

const configCmd: Command = {
  name: 'config',
  aliases: ['cfg'],
  description: 'Manage QOOCODE configuration',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Config Commands:
    /config show       - Show current configuration
    /config set <key> <value> - Set a config value
    /config get <key>  - Get a config value
    /config reset      - Reset to default configuration
    /config list       - List all config keys and values
    
  Configuration affects QOOCODE's behavior.`
    }
    return `__CONFIG_COMMAND__:${args}`
  },
}

const diffCmd: Command = {
  name: 'diff',
  description: 'Show git diff of changes',
  type: 'local',
  execute(args: string) {
    return `__GIT_DIFF__:${args}`
  },
}

const branchCmd: Command = {
  name: 'branch',
  aliases: ['br'],
  description: 'Manage git branches',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Branch Commands:
    /branch list       - List all branches
    /branch create <name> - Create a new branch
    /branch switch <name> - Switch to a branch
    /branch delete <name> - Delete a branch
    /branch merge <name> - Merge a branch`
    }
    return `__GIT_BRANCH__:${args}`
  },
}

const statsCmd: Command = {
  name: 'stats',
  description: 'Show usage statistics',
  type: 'local',
  execute(_args: string) {
    return `__SHOW_STATS__`
  },
}

const usageCmd: Command = {
  name: 'usage',
  description: 'Show resource usage',
  type: 'local',
  execute(_args: string) {
    return `__SHOW_USAGE__`
  },
}

const buildCmd: Command = {
  name: 'build',
  description: 'Build the project',
  type: 'local',
  execute(args: string) {
    return `__BUILD_PROJECT__:${args}`
  },
}

const runCmd: Command = {
  name: 'run',
  description: 'Run the project',
  type: 'local',
  execute(args: string) {
    return `__RUN_PROJECT__:${args}`
  },
}

const mergeCmd: Command = {
  name: 'merge',
  description: 'Merge git branches',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Usage: /merge <branch-name>
  
  Merge specified branch into current branch.
  
  Example: /merge feature/add-new-functionality`
    }
    return `__GIT_MERGE__:${args}`
  },
}

const envCmd: Command = {
  name: 'env',
  description: 'Manage environment variables',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Environment Commands:
    /env list            - List all environment variables
    /env get <name>      - Get an environment variable
    /env set <name> <value> - Set an environment variable
    /env unset <name>    - Unset an environment variable
    
  Environment variables are stored in .env file.`
    }
    return `__ENV_COMMAND__:${args}`
  },
}

const settingsCmd: Command = {
  name: 'settings',
  aliases: ['setting'],
  description: 'Manage user settings',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Settings Commands:
    /settings show       - Show current settings
    /settings set <key> <value> - Set a setting
    /settings reset      - Reset to default settings
    
  Settings control QOOCODE's behavior and appearance.`
    }
    return `__SETTINGS_COMMAND__:${args}`
  },
}

const debugCmd: Command = {
  name: 'debug',
  description: 'Debug tools and commands',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Debug Commands:
    /debug info          - Show debug information
    /debug logs          - Show recent logs
    /debug test <tool>   - Test a specific tool
    /debug diagnose      - Run diagnostics
    
  Use debug mode when troubleshooting issues.`
    }
    return `__DEBUG_COMMAND__:${args}`
  },
}

const continueCmd: Command = {
  name: 'continue',
  aliases: ['cont'],
  description: 'Continue execution of a plan or task',
  type: 'local',
  execute(args: string) {
    return `__CONTINUE_EXECUTION__:${args}`
  },
}

const modifyCmd: Command = {
  name: 'modify',
  description: 'Modify current plan',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Usage: /modify <modifications>
  
  Modify current execution plan.
  Describe what changes you want to make.
  
  Example: /modify Add error handling to step 3`
    }
    return `__MODIFY_PLAN__:${args}`
  },
}

const contextCmd: Command = {
  name: 'context',
  aliases: ['ctx'],
  description: 'Manage conversation context',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Context Commands:
    /context show        - Show current context
    /context add <file>  - Add file to context
    /context remove <file> - Remove file from context
    /context clear       - Clear context
    
  Context controls what files AI is aware of.`
    }
    return `__CONTEXT_COMMAND__:${args}`
  },
}

const filesCmd: Command = {
  name: 'files',
  description: 'List files in workspace',
  type: 'local',
  execute(args: string) {
    return `__LIST_FILES__:${args}`
  },
}

const statusCmd: Command = {
  name: 'status',
  aliases: ['st'],
  description: 'Show system status',
  type: 'local',
  execute(_args: string) {
    return `__SHOW_STATUS__`
  },
}

const resumeCmd: Command = {
  name: 'resume',
  aliases: ['restore'],
  description: 'Resume a previous session or snapshot',
  type: 'local',
  execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()
    
    // Show snapshots
    if (subcommand === 'snapshots' || subcommand === 'list') {
      const sessionManager = getSessionManager()
      const snapshots = sessionManager.getSnapshotHistory()
      
      if (snapshots.length === 0) {
        return 'No snapshots available.\n\nSnapshots are created automatically before /rewind operations.'
      }
      
      const lines = ['Available Snapshots:']
      for (const snapshot of snapshots) {
        const time = snapshot.timestamp.toLocaleString()
        const desc = snapshot.description || 'Snapshot'
        lines.push(`\n  ${snapshot.id}`)
        lines.push(`    ${desc}`)
        lines.push(`    ${snapshot.messageCount} messages - ${time}`)
      }
      
      return lines.join('\n')
    }
    
    // Restore a snapshot
    if (parts[0] && !parts[0].startsWith('-')) {
      const sessionManager = getSessionManager()
      const snapshot = sessionManager.getSnapshot(parts[0])
      
      if (snapshot) {
        return `__RESTORE_SNAPSHOT__:${parts[0]}`
      }
      
      // Otherwise treat as session restore
      return `__RESUME_SESSION__:${args}`
    }
    
    // Show help
    return `  Resume Command
  
  Usage: /resume <session-id>
         /resume snapshots
  
  Options:
    /resume snapshots  - List available snapshots
    /resume <id>      - Restore a snapshot by ID
    /resume <session> - Resume a saved session
  
  Use /session list to see available sessions.`
  },
}

const exportCmd: Command = {
  name: 'export',
  description: 'Export session or data',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Usage: /export <session-id> [format]
  
  Export a session to a file.
  Formats: json, markdown, html
  
  Example: /export session-123 markdown`
    }
    return `__EXPORT_DATA__:${args}`
  },
}

const importCmd: Command = {
  name: 'import',
  description: 'Import session or data',
  type: 'local',
  execute(args: string) {
    if (!args.trim()) {
      return `  Usage: /import <file-path>
  
  Import a session or data from a file.
  
  Supported formats: json, markdown`
    }
    return `__IMPORT_DATA__:${args}`
  },
}

const doctorCmd: Command = {
  name: 'doctor',
  description: 'Run system diagnostics',
  type: 'local',
  async execute(_args: string) {
    const diagnostics = await runDiagnostics()
    const summary = getDiagnosticsSummary(diagnostics)
    const report = formatDiagnostics(diagnostics)
    
    const summaryLine = `\nSummary: ${summary.ok} OK, ${summary.warnings} warnings, ${summary.errors} errors`
    
    return report + summaryLine
  },
}

const vimCmd: Command = {
  name: 'vim',
  aliases: ['vi'],
  description: 'Toggle Vim input mode',
  type: 'local',
  execute(args: string) {
    if (args.trim() === 'help') {
      return `  Vim Mode Commands:
    h/j/k/l   - Move cursor (or arrow keys)
    w/b       - Word forward/backward
    0/$       - Line start/end
    i/a       - Enter insert mode
    x         - Delete character
    u         - Undo
    p         - Paste
    ESC       - Return to normal mode

  Usage: /vim - Toggle Vim mode
         /vim help - Show this help`
    }
    return `__VIM_MODE__:${args || 'toggle'}`
  },
}

const permissionsCmd: Command = {
  name: 'permissions',
  aliases: ['perm'],
  description: 'Manage permission settings',
  type: 'local',
  execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()
    const value = parts[1]?.toLowerCase()
    
    // Show help
    if (!subcommand || subcommand === 'help') {
      return PERMISSIONS_HELP
    }
    
    // List all permission levels
    if (subcommand === 'list') {
      const levels = getAllPermissionLevels()
      const lines = ['Available permission levels:']
      for (const level of levels) {
        const info = getPermissionInfo(level as PermissionLevel)
        if (info) {
          const marker = level === getCurrentPermissionLevel() ? ' (current)' : ''
          lines.push(`  ${level}${marker}`)
          lines.push(`    ${info.description}`)
        }
      }
      return lines.join('\n')
    }
    
    // Show current status
    if (subcommand === 'show' || subcommand === 'status') {
      const status = getPermissionStatus()
      const info = getPermissionInfo(status.currentLevel)
      const lines = [
        'Permission Status:',
        `  Current Level: ${status.currentLevel}`,
        `  Requires Confirmation: ${status.requiresConfirmation ? 'Yes' : 'No'}`,
        `  Bypasses All Checks: ${status.bypassesAllChecks ? 'Yes' : 'No'}`,
        `  Is Sandboxed: ${status.isSandboxed ? 'Yes' : 'No'}`,
        '',
        info ? `${info.description}` : '',
      ]
      return lines.filter(Boolean).join('\n')
    }
    
    // Set permission level
    if (subcommand === 'set') {
      if (!value) {
        return 'Usage: /permissions set <level>\n\nAvailable levels: default, plan, auto, bypassPermissions, sandbox'
      }
      
      if (!isValidPermissionMode(value)) {
        return `Invalid permission level: ${value}\n\nAvailable levels: ${getAllPermissionLevels().join(', ')}`
      }
      
      const success = setPermissionLevel(value as PermissionLevel)
      if (success) {
        const info = getPermissionInfo(value as PermissionLevel)
        return `Permission level set to: ${value}\n\n${info?.description || ''}`
      }
      return 'Failed to set permission level'
    }
    
    // Default: show status
    return `Usage: /permissions <command>

Commands:
  /permissions show     - Show current permission status
  /permissions list     - List all available levels
  /permissions set <level> - Set permission level
  /permissions help     - Show this help

Use /permissions help for more information.`
  },
}

const compactCmd: Command = {
  name: 'compact',
  aliases: ['compress'],
  description: 'Compress conversation context to reduce token usage',
  type: 'local',
  execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()
    const maxTokensArg = parts[1]
    
    // Parse max tokens option - check if first arg is a number
    let maxTokens = 10000
    if (maxTokensArg && !isNaN(parseInt(maxTokensArg))) {
      maxTokens = parseInt(maxTokensArg)
    } else if (subcommand && !isNaN(parseInt(subcommand))) {
      // First arg is a number
      maxTokens = parseInt(subcommand)
    }
    
    // Show help
    if (!subcommand || subcommand === 'help') {
      return `  Context Compression
  
  Usage: /compact [preview] [max-tokens]
  
  Compresses the conversation context to reduce token usage while preserving important information.
  
  Options:
    preview      - Show what would be compressed without applying
    max-tokens   - Target token limit (default: 10000)
  
  Example:
    /compact           - Compress context
    /compact preview   - Preview compression
    /compact 5000      - Compress to 5000 tokens`
    }
    
    // Preview mode - returns special token for REPL to handle
    if (subcommand === 'preview') {
      return `__COMPACT_PREVIEW__:${maxTokens}`
    }
    
    // Compress mode - returns special token for REPL to handle
    return `__COMPACT_COMPRESS__:${maxTokens}`
  },
}

const initCmd: Command = {
  name: 'init',
  description: 'Initialize QOOCODE.md project documentation',
  type: 'prompt',
  async execute(args: string) {
    // This is a prompt-type command that triggers AI analysis
    // The actual implementation will be handled by the AI with this prompt
    const initPrompt = `Analyze this codebase and create QOOCODE.md file(s) to help future sessions work more effectively.

Steps:
1. Explore the project structure - read package.json, README, config files, etc.
2. Identify:
   - Build, test, and lint commands
   - Project architecture and structure
   - Code style conventions
   - Required environment setup
3. Create a QOOCODE.md file at the project root with essential information

The QOOCODE.md should include:
- Commands for building, testing, and linting
- High-level architecture overview
- Important conventions and rules
- Environment setup requirements

Start by exploring the project.`

    return `__INIT_PROJECT__:${initPrompt}`
  },
}

const desktopCmd: Command = {
  name: 'desktop',
  aliases: ['dt'],
  description: 'Desktop integration status',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = parts[0]?.toLowerCase() || 'info'

    const input: DesktopInput = {
      action: action as DesktopInput['action'],
    }

    const result = await executeDesktopCommand(input)

    return `
Desktop Integration Status
=========================

Platform: ${process.platform}
Status: ${result.available ? 'Available' : 'Not Available'}

${result.message}
`
  },
}

const mobileCmd: Command = {
  name: 'mobile',
  aliases: ['mb'],
  description: 'Mobile integration status',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = parts[0]?.toLowerCase() || 'info'
    const platform = (parts[1]?.toLowerCase() as 'ios' | 'android') || 'ios'

    const input: MobileInput = {
      action: action as MobileInput['action'],
      platform: getAvailablePlatforms().includes(platform) ? platform : 'ios',
    }

    const result = await executeMobileCommand(input)

    return `
Mobile Integration Status
=========================

Platform: ${result.platform.toUpperCase()}
Action: ${result.action}

${result.message}
`
  },
}

const themeCmd: Command = {
  name: 'theme',
  aliases: ['t'],
  description: 'Change the color theme (light/dark/auto)',
  type: 'local',
  execute(args: string) {
    const parts = args.trim().toLowerCase().split(/\s+/)
    const action = parts[0] || ''

    // Get current theme
    const currentTheme = loadSavedTheme()

    // Handle commands
    if (action === 'toggle') {
      const manager = getThemeManager()
      manager.toggleTheme()
      const newTheme = manager.getTheme().name.toUpperCase()
      return `Theme changed to: ${newTheme}\n\nRestart the application to apply the new theme.`
    }

    if (action && action !== 'list' && action !== 'show') {
      const newTheme = validateThemeName(action)
      if (newTheme) {
        setTheme(newTheme)
        return `Theme set to: ${newTheme.toUpperCase()}\n\nRestart the application to apply the new theme.`
      } else {
        return `Invalid theme: ${action}\n\nAvailable themes: light, dark, auto\n\nUse /theme to see current settings.`
      }
    }

    // Show current theme
    return formatThemeInfo(currentTheme)
  },
}

const btwCmd: Command = {
  name: 'btw',
  aliases: ['debug'],
  description: 'Internal debug commands',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = (parts[0] || 'status') as 'status' | 'memory' | 'cache' | 'stats' | 'env' | 'debug'

    const result = await executeBtwCommand({ action })

    return result.message
  },
}

const bughunterCmd: Command = {
  name: 'bughunter',
  aliases: ['bh', 'bugs'],
  description: 'Scan for bugs and code issues',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = (parts[0] || 'scan') as 'scan' | 'patterns' | 'fix' | 'report'
    const target = parts[1] && !parts[1].includes('=') ? parts[1] : undefined
    const severity = args.includes('severity=') 
      ? args.split('severity=')[1]?.split(/\s/)[0] as 'low' | 'medium' | 'high' | 'critical'
      : undefined

    const result = await executeBughunterCommand({
      action,
      target,
      severity,
    })

    return result.message
  },
}

const loginCmd: Command = {
  name: 'login',
  aliases: ['account', 'signin'],
  description: 'Login to your account',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = (parts[0] || 'status') as 'status' | 'login' | 'logout' | 'refresh'
    const email = parts[1]

    const result = await executeLoginCommand({
      action,
      email,
    })

    return result.message
  },
}

const logoutCmd: Command = {
  name: 'logout',
  aliases: ['signout'],
  description: 'Logout from your account',
  type: 'local',
  async execute(_args: string) {
    const result = await executeLoginCommand({ action: 'logout' })
    return result.message
  },
}

const heapdumpCmd: Command = {
  name: 'heapdump',
  aliases: ['heap', 'memory'],
  description: 'Generate heap memory snapshots',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = (parts[0] || 'create') as 'create' | 'analyze' | 'info'
    const output = parts[1]

    const result = await executeHeapdumpCommand({
      action,
      output,
    })

    return result.message
  },
}

const mockLimitsCmd: Command = {
  name: 'mock-limits',
  aliases: ['ratelimit', 'limits'],
  description: 'Simulate rate limits for testing',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = (parts[0] || 'status') as 'enable' | 'disable' | 'status' | 'set'
    const limitType = parts[1] as 'tokens' | 'requests' | 'toolcalls' | 'errors' | 'delay'
    const value = parts[2] ? parseInt(parts[2], 10) : undefined

    const result = await executeMockLimitsCommand({
      action,
      limitType,
      value,
    })

    return result.message
  },
}

const updateCmd: Command = {
  name: 'update',
  description: 'Check for updates or update QOOCODE',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = parts[0]?.toLowerCase() || 'check'

    // Check for updates
    if (action === 'check' || action === 'info') {
      const updateInfo = await checkForUpdates()

      const lines = [
        '🔄 QOOCODE Update Check',
        '========================',
        '',
        `Current Version: ${updateInfo.currentVersion}`,
        `Latest Version:  ${updateInfo.latestVersion || 'Unknown'}`,
        '',
      ]

      if (updateInfo.hasUpdate) {
        lines.push(`✨ ${updateInfo.message}`)
        lines.push('')
        lines.push('To update, run:')
        lines.push('  npm update -g QOOCODE-cli')
        lines.push('  # or')
        lines.push('  bun update -g QOOCODE-cli')
      } else {
        lines.push(`✅ ${updateInfo.message || 'Already up to date!'}`)
      }

      return lines.join('\n')
    }

    // List version history
    if (action === 'history' || action === 'versions') {
      const limit = parseInt(parts[1], 10) || 10
      const versions = await getVersionHistory(limit)

      if (versions.length === 0) {
        return 'Could not fetch version history.'
      }

      const lines = [
        '📜 Version History',
        '==================',
        '',
        ...versions.map((v) => {
          const marker = compareVersions(v, CURRENT_VERSION) === 0 ? ' ← current' : ''
          return `  ${v}${marker}`
        }),
        '',
        `Showing last ${versions.length} versions.`,
      ]

      return lines.join('\n')
    }

    // Perform update
    if (action === 'install' || action === 'do' || action === 'run') {
      const result = await performUpdate()

      const lines = [
        '🔄 Update Result',
        '================',
        '',
      ]

      switch (result.status) {
        case 'success':
          lines.push(`✅ Successfully updated to version ${result.version}`)
          lines.push('')
          lines.push('Please restart QOOCODE to use the new version.')
          break
        case 'up_to_date':
          lines.push('✅ Already up to date!')
          break
        case 'no_permissions':
          lines.push('❌ No permissions to update.')
          lines.push('')
          lines.push('Try running with sudo:')
          lines.push('  sudo npm update -g QOOCODE-cli')
          break
        case 'install_failed':
          lines.push('❌ Update failed.')
          lines.push('')
          lines.push('You can try updating manually:')
          lines.push('  npm update -g QOOCODE-cli')
          break
        default:
          lines.push(`Status: ${result.status}`)
      }

      return lines.join('\n')
    }

    // Show update info
    return getUpdateInfo()
  },
}

const swarmCmd: Command = {
  name: 'swarm',
  aliases: ['team', 'teams'],
  description: 'Manage swarm team collaboration',
  type: 'local',
  execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = parts[0]?.toLowerCase() || 'info'

    // Show team info
    if (action === 'info' || action === 'status') {
      const teams = getAllTeams()

      if (teams.length === 0) {
        return `🐝 Swarm Team Status
========================

No active teams.

Use /swarm create <name> to create a team.`
      }

      const lines = [
        '🐝 Swarm Team Status',
        '====================',
        '',
      ]

      for (const team of teams) {
        lines.push(`Team: ${team.name}`)
        lines.push(`  Description: ${team.description || 'No description'}`)
        lines.push(`  Members: ${team.members.length}`)
        lines.push(`  Created: ${new Date(team.createdAt).toLocaleString()}`)
        lines.push('')

        for (const member of team.members) {
          lines.push(`  - ${member.name} (${member.agentType})`)
        }
        lines.push('')
      }

      return lines.join('\n')
    }

    // Create team
    if (action === 'create' || action === 'new') {
      const teamName = parts.slice(1).join(' ')

      if (!teamName) {
        return `Usage: /swarm create <team-name>

Example: /swarm create my-team`
      }

      // This will be handled via TeamCreateTool in the query
      return `__TEAM_CREATE__:${teamName}`
    }

    // List teams
    if (action === 'list' || action === 'ls') {
      const teams = getAllTeams()

      if (teams.length === 0) {
        return 'No teams created yet.'
      }

      const lines = [
        'Active Teams:',
        '',
        ...teams.map((t) => `  - ${t.name} (${t.members.length} members)`),
      ]

      return lines.join('\n')
    }

    // Delete team
    if (action === 'delete' || action === 'disband' || action === 'cleanup') {
      return '__TEAM_DELETE__'
    }

    // Help
    return `🐝 Swarm Team Commands
=========================

Usage: /swarm <command>

Commands:
  /swarm info          - Show current team status
  /swarm create <name> - Create a new team
  /swarm list          - List all teams
  /swarm delete        - Delete/disband current team

Team Features:
  - Create teams to coordinate multiple agents
  - Use Agent tool to spawn worker agents
  - Use SendMessage to communicate with team members
  - Use TaskStop to stop running agents

Example workflow:
  /swarm create my-team
  Agent(prompt="Research auth module")
  Agent(prompt="Write tests")
  SendMessage(to="worker-1", message="Share findings")`
  },
}

const allCommands: Command[] = [helpCmd, clearCmd, exitCmd, costCmd, modelCmd, commitCmd, reviewCmd, mcpCmd, pluginCmd, planCmd, sessionCmd, skillsCmd, agentsCmd, testCmd, workspaceCmd, configCmd, diffCmd, branchCmd, statsCmd, usageCmd, buildCmd, runCmd, mergeCmd, envCmd, settingsCmd, debugCmd, continueCmd, modifyCmd, contextCmd, filesCmd, statusCmd, resumeCmd, exportCmd, importCmd, doctorCmd, vimCmd, permissionsCmd, compactCmd, initCmd, rewindCmd, prCommentsCmd, fastCmd, hooksCmd, upgradeCmd, desktopCmd, mobileCmd, themeCmd, btwCmd, bughunterCmd, loginCmd, logoutCmd, heapdumpCmd, mockLimitsCmd, chromeCmd, memory, updateCmd, swarmCmd, cacheCmd, insightsCommand, thinkbackCommand, thinkbackPlayCommand, ultraplanCommand, speechCommand]

export function getCommands(): Command[] {
  return allCommands
}

export function findCommand(name: string, commands: Command[]): Command | undefined {
  return commands.find(
    (cmd) => cmd.name === name || cmd.aliases?.includes(name),
  )
}
