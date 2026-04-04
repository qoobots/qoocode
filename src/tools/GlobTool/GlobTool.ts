import { z } from 'zod'
import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  pattern: z.string().describe('Glob pattern to match files (e.g. "**/*.ts")'),
  path: z.string().optional().describe('Directory to search in (default: workspace root)'),
  exclude: z.string().optional().describe('Glob pattern to exclude (e.g. "node_modules")'),
  maxResults: z.number().optional().describe('Maximum number of results (default: 100)'),
})

type Input = z.infer<typeof inputSchema>

// Simple glob-to-regex converter for basic patterns
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`, 'i')
}

async function walkDir(
  dir: string,
  filePattern: RegExp,
  excludePattern: RegExp | null,
  results: string[],
  maxResults: number,
): Promise<void> {
  if (results.length >= maxResults) return

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (results.length >= maxResults) break

      const fullPath = path.join(dir, entry.name)
      const relPath = fullPath.replace(/\\/g, '/')

      if (excludePattern && excludePattern.test(relPath)) continue
      if (entry.name === '.git' || entry.name === 'node_modules') continue

      if (entry.isDirectory()) {
        await walkDir(fullPath, filePattern, excludePattern, results, maxResults)
      } else if (filePattern.test(entry.name)) {
        results.push(relPath)
      }
    }
  } catch {
    // Permission errors etc - skip
  }
}

export const GlobTool = buildTool({
  name: 'Glob',
  aliases: ['glob', 'find-files'],
  description:
    'Find files matching a glob pattern. Returns file paths relative to the search directory.',
  inputSchema,
  maxResultSizeChars: 50_000,

  async call(input: Input): Promise<ToolResult> {
    const searchPath = input.path ?? getCwd()
    const maxResults = input.maxResults ?? 100
    const filePattern = globToRegex(input.pattern.includes('/') ? input.pattern.split('/').pop()! : input.pattern)
    const excludePattern = input.exclude ? globToRegex(input.exclude) : null

    const results: string[] = []
    await walkDir(searchPath, filePattern, excludePattern, results, maxResults)

    const content = results.length > 0
      ? results.join('\n')
      : 'No files found matching pattern.'

    return {
      data: { files: results },
      content,
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `Glob(${input?.pattern ?? ''})`
  },
})

