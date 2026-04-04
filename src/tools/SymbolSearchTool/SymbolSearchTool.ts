import { z } from 'zod'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  symbol: z.string().describe('Symbol name to search for (function, class, variable, etc.)'),
  path: z.string().optional().describe('Directory to search in (default: workspace root)'),
  type: z.enum(['all', 'function', 'class', 'interface', 'variable', 'type', 'constant']).optional()
    .describe('Symbol type to filter by'),
  maxResults: z.number().optional().describe('Maximum number of results (default: 20)'),
})

type Input = z.infer<typeof inputSchema>

interface SymbolMatch {
  file: string
  line: number
  column: number
  context: string
  type: string
}

// Simple regex patterns for different symbol types
const PATTERNS = {
  function: /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*\([^)]*\)\s*\{)/g,
  class: /class\s+(\w+)/g,
  interface: /interface\s+(\w+)/g,
  variable: /(?:const|let|var)\s+(\w+)/g,
  type: /type\s+(\w+)/g,
  constant: /const\s+(\w+)/g,
}

async function searchInFile(
  filePath: string,
  symbol: string,
  type?: string,
): Promise<SymbolMatch[]> {
  const matches: SymbolMatch[] = []

  try {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    const symbolLower = symbol.toLowerCase()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Check if line contains the symbol
      if (line.toLowerCase().includes(symbolLower)) {
        let symbolType = 'unknown'

        // Determine symbol type
        if (type === 'function' || type === 'all') {
          if (/\bfunction\s+/.test(line) || /\b(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(/.test(line)) {
            symbolType = 'function'
          }
        }
        if (type === 'class' || type === 'all') {
          if (/class\s+/.test(line)) symbolType = 'class'
        }
        if (type === 'interface' || type === 'all') {
          if (/interface\s+/.test(line)) symbolType = 'interface'
        }
        if (type === 'variable' || type === 'all') {
          if (/\b(?:const|let|var)\s+/.test(line)) symbolType = 'variable'
        }
        if (type === 'type' || type === 'all') {
          if (/type\s+/.test(line)) symbolType = 'type'
        }
        if (type === 'constant' || type === 'all') {
          if (/const\s+/.test(line)) symbolType = 'constant'
        }

        // Get surrounding context
        const start = Math.max(0, i - 1)
        const end = Math.min(lines.length, i + 2)
        const context = lines.slice(start, end).join('\n')

        matches.push({
          file: filePath,
          line: i + 1,
          column: line.indexOf(symbol),
          context,
          type: symbolType,
        })
      }
    }
  } catch {
    // Skip files that can't be read
  }

  return matches
}

async function walkAndSearch(
  dirPath: string,
  symbol: string,
  type?: string,
  maxResults = 20,
): Promise<SymbolMatch[]> {
  const results: SymbolMatch[] = []

  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'target', 'coverage', '.next', 'dist']

  try {
    const entries = await readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (results.length >= maxResults) break

      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        if (!ignoreDirs.includes(entry.name) && !entry.name.startsWith('.')) {
          const subResults = await walkAndSearch(fullPath, symbol, type, maxResults - results.length)
          results.push(...subResults)
        }
      } else if (entry.isFile()) {
        // Only search in code files
        const ext = path.extname(entry.name)
        const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.cs', '.rb', '.php']

        if (codeExts.includes(ext)) {
          const fileResults = await searchInFile(fullPath, symbol, type)
          results.push(...fileResults)
        }
      }
    }
  } catch {
    // Skip directories that can't be read
  }

  return results
}

export const SymbolSearchTool = buildTool({
  name: 'SymbolSearch',
  aliases: ['symbol', 'search-symbol', 'find-symbol'],
  description:
    'Search for a symbol (function, class, variable, etc.) across the codebase.',
  inputSchema,
  maxResultSizeChars: 50_000,

  async call(input: Input): Promise<ToolResult> {
    const { symbol, path: searchPath, type, maxResults } = input
    const cwd = getCwd()
    const searchDir = searchPath ? path.join(cwd, searchPath) : cwd

    if (!existsSync(searchDir)) {
      return {
        data: { symbol, error: 'Search path does not exist' },
        content: `Error: Search path does not exist: ${searchPath || 'workspace root'}`,
      }
    }

    const results = await walkAndSearch(searchDir, symbol, type, maxResults ?? 20)

    if (results.length === 0) {
      return {
        data: { symbol, count: 0 },
        content: `🔍 No symbols found matching "${symbol}"${type ? ` (type: ${type})` : ''}`,
      }
    }

    // Group by file
    const byFile = new Map<string, SymbolMatch[]>()
    for (const match of results) {
      const existing = byFile.get(match.file) || []
      existing.push(match)
      byFile.set(match.file, existing)
    }

    const content = `🔍 Symbol "${symbol}" found ${results.length} times${type ? ` (type: ${type})` : ''}:\n\n` +
      Array.from(byFile.entries())
        .slice(0, 10)
        .map(([file, matches]) => {
          const matchList = matches
            .slice(0, 5)
            .map((m) => `  ${m.line}: ${m.context.split('\n')[0].trim().slice(0, 60)}`)
            .join('\n')
          return `📄 **${file}**\n${matchList}`
        })
        .join('\n\n')

    return {
      data: {
        symbol,
        count: results.length,
        files: Array.from(byFile.keys()),
        results: results.slice(0, 20),
      },
      content,
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `SymbolSearch(${input?.symbol ?? ''})`
  },
})
