import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  file: z.string().describe('File path containing the symbol'),
  symbol: z.string().describe('Symbol name to find definition for'),
  line: z.number().optional().describe('Line number where symbol is located (optional, helps with ambiguity)'),
})

type Input = z.infer<typeof inputSchema>

interface SymbolMatch {
  line: number
  column: number
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'import'
  name: string
  content: string
}

function findSymbolDefinition(
  content: string,
  symbol: string,
  startLine?: number,
): SymbolMatch | null {
  const lines = content.split('\n')

  // Common patterns for definitions
  const patterns = [
    // Functions: function foo() {}
    {
      type: 'function' as const,
      regex: /(?:function|const|let|var|async\s+function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
    },
    // Classes: class Foo {}
    {
      type: 'class' as const,
      regex: /(?:class|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    },
    // Exports: export const foo = ...
    {
      type: 'function' as const,
      regex: /export\s+(?:async\s+)?(?:function|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=|\()/g,
    },
    // Imports: import { foo } from ...
    {
      type: 'import' as const,
      regex: /import\s*{[^}]*\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g,
    },
  ]

  let bestMatch: SymbolMatch | null = null
  let bestScore = 0

  for (const pattern of patterns) {
    const matches = content.matchAll(pattern.regex)

    for (const match of matches) {
      const symbolName = match[1]
      if (symbolName === symbol) {
        // Find line number
        const position = content.substring(0, match.index!).split('\n').length - 1
        const line = position
        const lineContent = lines[line] || ''

        // Calculate score based on proximity to startLine
        let score = 100
        if (startLine !== undefined) {
          const distance = Math.abs(line - startLine)
          score = Math.max(0, 100 - distance)
        }

        // Prefer functions/classes over imports
        if (pattern.type === 'function' || pattern.type === 'class') {
          score += 50
        } else if (pattern.type === 'import') {
          score -= 20
        }

        if (score > bestScore) {
          bestScore = score
          bestMatch = {
            line,
            column: match.index! - content.substring(0, match.index!).lastIndexOf('\n'),
            type: pattern.type,
            name: symbol,
            content: lineContent.trim(),
          }
        }
      }
    }
  }

  return bestMatch
}

export const GotoDefinitionTool = buildTool({
  name: 'GotoDefinition',
  aliases: ['goto', 'go-to-def', 'definition'],
  description:
    'Find the definition of a symbol (function, class, variable) in a file. Helps navigate code by locating where symbols are defined.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      const filePath = path.resolve(getCwd(), input.file)
      const content = await readFile(filePath, 'utf-8')

      const match = findSymbolDefinition(content, input.symbol, input.line)

      if (!match) {
        // Try fuzzy matching
        const fuzzyMatches: string[] = []
        const lines = content.split('\n')

        for (const pattern of [/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, /interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g]) {
          const matches = content.matchAll(pattern)
          for (const m of matches) {
            const name = m[1]
            if (name.toLowerCase().includes(input.symbol.toLowerCase()) && name !== input.symbol) {
              fuzzyMatches.push(name)
            }
          }
        }

        const uniqueMatches = [...new Set(fuzzyMatches)].slice(0, 10)

        if (uniqueMatches.length > 0) {
          return {
            data: {
              symbol: input.symbol,
              found: false,
              suggestions: uniqueMatches,
            },
            content: `⚠️ Symbol "${input.symbol}" not found as exact match.

Did you mean:
${uniqueMatches.map(m => `  - ${m}`).join('\n')}`,
          }
        }

        return {
          data: {
            symbol: input.symbol,
            found: false,
          },
          content: `⚠️ Definition not found for symbol: "${input.symbol}"

File: ${filePath}

Tip: This tool uses basic pattern matching. For more accurate results with LSP support:
1. Install a language server for your project
2. Ensure the file is in a supported language (TS, JS, Python, etc.)`,
        }
      }

      // Get context around the definition
      const lines = content.split('\n')
      const contextStart = Math.max(0, match.line - 2)
      const contextEnd = Math.min(lines.length, match.line + 3)

      const contextLines = lines.slice(contextStart, contextEnd).map((line, idx) => {
        const num = contextStart + idx + 1
        const prefix = num === match.line + 1 ? '→ ' : '  '
        return `${String(num).padStart(4, ' ')}${prefix}${line}`
      })

      const icon = match.type === 'function' ? 'ƒ' : match.type === 'class' ? '📦' : match.type === 'interface' ? '🔗' : match.type === 'import' ? '📥' : '📌'

      return {
        data: {
          symbol: input.symbol,
          found: true,
          file: filePath,
          line: match.line + 1, // 1-based for display
          column: match.column,
          type: match.type,
        },
        content: `${icon} Definition found for "${input.symbol}"

${'─'.repeat(50)}
Type: ${match.type}
File: ${filePath}
Line: ${match.line + 1}
${'─'.repeat(50)}

Context:
${contextLines.join('\n')}
`,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: {
          symbol: input.symbol,
          found: false,
          error: errorMessage,
        },
        content: `✗ Failed to find definition: ${errorMessage}`,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `GotoDefinition(${input?.symbol ?? 'symbol'} in ${input?.file ?? 'file'})`
  },
})

