import { z } from 'zod'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const execAsync = promisify(exec)

const inputSchema = z.object({
  pattern: z.string().describe('The regular expression pattern to search for'),
  path: z.string().optional().describe('Directory or file path to search in (default: workspace root)'),
  include: z.string().optional().describe('File glob pattern to include (e.g. "*.ts")'),
  exclude: z.string().optional().describe('File glob pattern to exclude (e.g. "node_modules")'),
  contextBefore: z.number().optional().describe('Number of context lines before match'),
  contextAfter: z.number().optional().describe('Number of context lines after match'),
})

type Input = z.infer<typeof inputSchema>

function getRgBinary(): string {
  if (process.platform === 'win32') {
    // On Windows, try rg.exe
    return 'rg.exe'
  }
  return 'rg'
}

export const GrepTool = buildTool({
  name: 'Grep',
  aliases: ['grep', 'search', 'find'],
  description:
    'Search for a pattern in file contents using ripgrep. Returns matching lines with file paths and line numbers.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    const searchPath = input.path ?? getCwd()
    const args: string[] = []

    // Always use line numbers and column numbers
    args.push('--line-number', '--column')

    // Context lines
    if (input.contextBefore) args.push('--before-context', String(input.contextBefore))
    if (input.contextAfter) args.push('--after-context', String(input.contextAfter))

    // Include/exclude patterns
    if (input.include) args.push('--glob', input.include)
    if (input.exclude) args.push('--glob', `!${input.exclude}`)

    // Ignore common dirs
    args.push('--glob', '!node_modules', '--glob', '!.git')

    // Max results to prevent huge output
    args.push('--max-count', '100')

    // Pattern and path
    args.push('--', input.pattern, searchPath)

    try {
      const { stdout, stderr } = await execAsync(`${getRgBinary()} ${args.join(' ')}`, {
        cwd: getCwd(),
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30_000,
      })

      return {
        data: { matches: stdout },
        content: stdout || 'No matches found.',
      }
    } catch (err: unknown) {
      const error = err as { code?: number; stdout?: string; stderr?: string; message?: string }
      // rg exits with code 1 when no matches found
      if (error.code === 1 && error.stdout) {
        return {
          data: { matches: error.stdout },
          content: error.stdout,
        }
      }
      if (error.code === 1) {
        return {
          data: { matches: '' },
          content: 'No matches found.',
        }
      }
      // rg not installed
      if (error.code === 127 || error.stderr?.includes('not found') || error.stderr?.includes('not recognized')) {
        return {
          data: { error: 'ripgrep not installed' },
          content: 'Error: ripgrep (rg) is not installed. Install it from https://github.com/BurntSushi/ripgrep',
        }
      }
      return {
        data: { error: error.message ?? 'Unknown error' },
        content: `Error: ${error.stderr || error.message || 'Unknown error'}`,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `Grep(${input?.pattern?.slice(0, 40) ?? ''})`
  },
})

