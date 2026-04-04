// Memory command - Manage qoocode memory files with typed taxonomy
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import type { Command, LocalCommandResult } from '../../types/command.js'
import { getConfigDirPath } from '../../utils/config.js'
import { getMemoryService } from '../../services/memory/memoryService.js'
import { type MemoryType, MEMORY_TYPE_DESCRIPTIONS } from '../../services/memory/memoryTypes.js'

export const memory: Command = {
  name: 'memory',
  description: 'Manage qoocode memory files with typed taxonomy',
  type: 'local',
  usage: 'memory [list|create|delete|show] [options]',
  async execute(args: string): Promise<LocalCommandResult> {
    const memoryService = getMemoryService()
    const memoryDir = memoryService.getMemoryDir()
    
    const parts = args.trim().split(/\s+/)
    const action = parts[0] || 'list'
    
    switch (action) {
      case 'list':
        return listMemories(memoryService)
      
      case 'create':
        return createMemory(memoryService, parts.slice(1))
      
      case 'delete':
        return deleteMemory(memoryService, parts.slice(1))
      
      case 'show':
        return showMemory(memoryService, parts.slice(1))
      
      case 'types':
        return showTypes()
      
      case 'entrypoint':
        return showEntrypoint(memoryService)
      
      case 'help':
        return showHelp()
      
      default:
        // Default to listing memories
        if (parts.length > 0 && existsSync(join(memoryDir, `${parts[0]}.md`))) {
          return showMemory(memoryService, parts)
        }
        return listMemories(memoryService)
    }
  },
}

function listMemories(memoryService: ReturnType<typeof getMemoryService>): LocalCommandResult {
  const entries = memoryService.listMemoryFiles()
  
  if (entries.length === 0) {
    return {
      content: `No memories found in ${memoryService.getMemoryDir()}\n\nUse '/memory create <name> <type> <description>' to create a memory.`,
      type: 'text',
    }
  }
  
  // Group by type
  const byType: Record<MemoryType, typeof entries> = {
    user: [],
    feedback: [],
    project: [],
    reference: [],
  }
  
  for (const entry of entries) {
    byType[entry.type].push(entry)
  }
  
  const lines: string[] = [`Memory files in ${memoryService.getMemoryDir()}:\n`]
  
  for (const [type, typeEntries] of Object.entries(byType)) {
    if (typeEntries.length > 0) {
      lines.push(`### ${type} (${typeEntries.length})`)
      for (const entry of typeEntries) {
        const date = new Date(entry.updatedAt).toLocaleDateString()
        lines.push(`  - ${entry.name}: ${entry.description} (${date})`)
      }
      lines.push('')
    }
  }
  
  lines.push('---')
  lines.push('Use "/memory create <name> <type> <description>" to add a memory')
  lines.push('Use "/memory show <name>" to view a memory')
  lines.push('Use "/memory delete <name>" to delete a memory')
  lines.push('Use "/memory types" to see memory type descriptions')
  
  return {
    content: lines.join('\n'),
    type: 'text',
  }
}

function createMemory(
  memoryService: ReturnType<typeof getMemoryService>,
  args: string[]
): LocalCommandResult {
  if (args.length < 3) {
    return {
      content: 'Usage: /memory create <name> <type> <description>\n\n' +
        'Example: /memory create my-preferences user "Prefers TypeScript over JavaScript"\n\n' +
        'Types: user, feedback, project, reference\n\n' +
        'Use "/memory types" to see type descriptions.',
      type: 'text',
    }
  }
  
  const name = args[0]
  const type = args[1] as MemoryType
  const description = args.slice(2).join(' ')
  
  if (!['user', 'feedback', 'project', 'reference'].includes(type)) {
    return {
      content: `Invalid type: ${type}\n\nValid types: user, feedback, project, reference\n\nUse "/memory types" to see type descriptions.`,
      type: 'text',
    }
  }
  
  try {
    const entry = memoryService.createMemoryEntry({ name, description, type })
    return {
      content: `Created memory "${name}" (${type}):\n${description}`,
      type: 'text',
    }
  } catch (error) {
    return {
      content: `Error creating memory: ${error}`,
      type: 'text',
    }
  }
}

function deleteMemory(
  memoryService: ReturnType<typeof getMemoryService>,
  args: string[]
): LocalCommandResult {
  if (args.length < 1) {
    return {
      content: 'Usage: /memory delete <name>',
      type: 'text',
    }
  }
  
  const name = args[0]
  
  try {
    const success = memoryService.deleteMemoryEntry(name)
    if (success) {
      return {
        content: `Deleted memory "${name}"`,
        type: 'text',
      }
    } else {
      return {
        content: `Memory "${name}" not found`,
        type: 'text',
      }
    }
  } catch (error) {
    return {
      content: `Error deleting memory: ${error}`,
      type: 'text',
    }
  }
}

function showMemory(
  memoryService: ReturnType<typeof getMemoryService>,
  args: string[]
): LocalCommandResult {
  if (args.length < 1) {
    return {
      content: 'Usage: /memory show <name>',
      type: 'text',
    }
  }
  
  const name = args[0]
  const fileName = `${name.toLowerCase().replace(/\s+/g, '-')}.md`
  const filePath = join(memoryService.getMemoryDir(), fileName)
  
  if (!existsSync(filePath)) {
    return {
      content: `Memory "${name}" not found`,
      type: 'text',
    }
  }
  
  try {
    const content = require('fs').readFileSync(filePath, 'utf-8')
    return {
      content: `# ${name}\n\n${content}`,
      type: 'text',
    }
  } catch (error) {
    return {
      content: `Error reading memory: ${error}`,
      type: 'text',
    }
  }
}

function showTypes(): LocalCommandResult {
  const lines = [
    '## Memory Types',
    '',
    'Each memory has a specific type:',
    '',
  ]
  
  for (const [type, description] of Object.entries(MEMORY_TYPE_DESCRIPTIONS)) {
    lines.push(`**${type}**: ${description}`)
  }
  
  lines.push('')
  lines.push('## Usage Examples')
  lines.push('')
  lines.push('/memory create my-role user "John is the tech lead"')
  lines.push('/memory create no-jquery feedback "Don\'t use jQuery"')
  lines.push('/memory create arch decision project "We use microservices"')
  lines.push('/memory create api-docs reference "API docs: example.com/api"')
  
  return {
    content: lines.join('\n'),
    type: 'text',
  }
}

function showEntrypoint(memoryService: ReturnType<typeof getMemoryService>): LocalCommandResult {
  const entrypoint = memoryService.readTruncatedEntrypoint()
  
  const lines = [
    `## MEMORY.md Entrypoint (${entrypoint.lineCount} lines)`,
    '',
  ]
  
  if (entrypoint.wasLineTruncated || entrypoint.wasByteTruncated) {
    lines.push('⚠️ Warning: Entrypoint was truncated')
    lines.push(`- Lines: ${entrypoint.lineCount} (max: 200)`)
    lines.push(`- Bytes: ${entrypoint.byteCount} (max: 25,000)`)
    lines.push('')
  }
  
  if (entrypoint.content) {
    lines.push(entrypoint.content)
  } else {
    lines.push('(empty)')
  }
  
  return {
    content: lines.join('\n'),
    type: 'text',
  }
}

function showHelp(): LocalCommandResult {
  return {
    content: `Memory Command Help
====================

Usage: /memory [action] [options]

Actions:
  list            List all memory entries (default)
  create <name> <type> <desc>  Create a new memory
  show <name>     Show a specific memory
  delete <name>   Delete a memory
  types           Show memory type descriptions
  entrypoint      Show MEMORY.md entrypoint content
  help            Show this help

Memory Types:
  user        Facts about the user
  feedback    Corrections and suggestions
  project     Project-specific context
  reference   External resources

Examples:
  /memory create my-preferences user "Prefers TypeScript"
  /memory create no-jquery feedback "Don\'t use jQuery"
  /memory list
  /memory show my-preferences
  /memory delete my-preferences`,
    type: 'text',
  }
}

export default memory
