import { z } from 'zod'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  file: z.string().describe('File path to search'),
  symbol: z.string().describe('Symbol name to find references for'),
  ignoreCase: z.boolean().optional().default(false).describe('Case insensitive search (default: false)'),
  maxResults: z.number().optional().default(50).describe('Maximum number of results'),
})

type Input = z.infer<typeof inputSchema>

interface Reference {
  line: number
  column: number
  type: 'call' | 'reference' | 'import' | 'usage'
  context: string
}

function findReferences(
  content: string,
  symbol: string,
  ignoreCase: boolean,
  maxResults: number,
): Reference[] {
  const lines = content.split('\n')
  const references: Reference[] = []

  // Patterns for finding references
  const patterns = [
    // Function calls: foo()
    {
      type: 'call' as const,
      regex: new RegExp(`\\b(${symbol})\\s*\\(`, ignoreCase ? 'gi' : 'g'),
    },
    // Property access: obj.foo
    {
      type: 'reference' as const,
      regex: new RegExp(`\\w+\\.(${symbol})\\b`, ignoreCase ? 'gi' : 'g'),
    },
    // Imports: import { foo } from ...
    {
      type: 'import' as const,
      regex: new RegExp(`import\\s*[^}]*\\b(${symbol})\\b`, ignoreCase ? 'gi' : 'g'),
    },
    // Variable references: const foo = ...
    {
      type: 'usage' as const,
      regex: new RegExp(`\\b(${symbol})\\b(?!\\s*[:(=,]\\()`, ignoreCase ? 'gi' : 'g'),
    },
  ]

  for (const pattern of patterns) {
    const matches = content.matchAll(pattern.regex)

    for (const match of matches) {
      if (references.length >= maxResults) {
        break
      }

      const matchedText = match[1]
      if (matchedText) {
        // Find line number
        const position = content.substring(0, match.index!).split('\n').length - 1
        const line = position
        const column = match.index! - content.substring(0, match.index!).lastIndexOf('\n')

        // Get context
        const lineContent = lines[line] || ''
        const context = lineContent.trim()

        references.push({
          line,
          column,
          type: pattern.type,
          context,
        })
      }
    }
  }

  // Remove duplicates and sort by line number
  const uniqueRefs = new Map<number, Reference>()
  for (const ref of references) {
    const key = ref.line * 1000 + ref.column
    if (!uniqueRefs.has(key)) {
      uniqueRefs.set(key, ref)
    }
  }

  return Array.from(uniqueRefs.values()).sort((a, b) => a.line - b.line)
}

export const FindReferencesTool = buildTool({
  name: 'FindReferences',
  aliases: ['refs', 'find-references', 'find-refs'],
  description:
    'Find all references to a symbol in a file. Shows where functions, classes, variables are used.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      const filePath = path.resolve(getCwd(), input.file)
      const content = await readFile(filePath, 'utf-8')

      const references = findReferences(
        content,
        input.symbol,
        input.ignoreCase,
        input.maxResults,
      )

      if (references.length === 0) {
        // Try fuzzy matching
        const fuzzyMatches: string[] = []
        const lines = content.split('\n')

        for (const pattern of [/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g, /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g]) {
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
            content: `⚠️ No references found for "${input.symbol}"

Did you mean:
${uniqueMatches.map(m => `  - ${m}`).join('\n')}`,
          }
        }

        return {
          data: {
            symbol: input.symbol,
            found: false,
            count: 0,
          },
          content: `⚠️ No references found for symbol: "${input.symbol}"

File: ${filePath}

Tip: Ensure the symbol name is spelled correctly and matches exactly.`,
        }
      }

      // Group references by type
      const byType = references.reduce((acc, ref) => {
        if (!acc[ref.type]) {
          acc[ref.type] = []
        }
        acc[ref.type].push(ref)
        return acc
      }, {} as Record<string, Reference[]>)

      // Format output
      let output = `🔍 References found for "${input.symbol}"`
      output += `\n${'─'.repeat(50)}`
      output += `\nFile: ${filePath}`
      output += `\nTotal: ${references.length} reference(s)\n`

      // Display by type
      const typeIcons: Record<string, string> = {
        call: '📞',
        reference: '📌',
        import: '📥',
        usage: '📍',
      }

      for (const [type, refs] of Object.entries(byType)) {
        const icon = typeIcons[type] || '•'
        output += `\n${icon} ${type.charAt(0).toUpperCase() + type.slice(1)} (${refs.length})`
        for (const ref of refs.slice(0, 10)) {
          output += `\n    Line ${ref.line + 1}: ${ref.context.substring(0, 80)}${ref.context.length > 80 ? '...' : ''}`
        }
        if (refs.length > 10) {
          output += `\n    ... and ${refs.length - 10} more`
        }
      }

      return {
        data: {
          symbol: input.symbol,
          found: true,
          count: references.length,
          references,
          byType,
          file: filePath,
        },
        content: output,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: {
          symbol: input.symbol,
          found: false,
          error: errorMessage,
        },
        content: `✗ Failed to find references: ${errorMessage}`,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `FindReferences(${input?.symbol ?? 'symbol'} in ${input?.file ?? 'file'})`
  },
})

