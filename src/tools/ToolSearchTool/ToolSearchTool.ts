// ToolSearchTool - Search for deferred tools by keyword or direct selection
// Enables dynamic tool discovery during the tool calling phase
import { buildTool } from '../../Tool.js'
import type { ToolDef, ToolUseContext } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod'

const inputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .describe(
        'Query to find deferred tools. Use "select:<tool_name>" for direct selection, or keywords to search.',
      ),
    max_results: z
      .number()
      .optional()
      .default(5)
      .describe('Maximum number of results to return (default: 5)'),
  })
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    matches: z.array(z.string()),
    query: z.string(),
    total_deferred_tools: z.number(),
    pending_mcp_servers: z.array(z.string()).optional(),
  })
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>

// Tool description cache
const descriptionCache = new Map<string, string>()

/**
 * Clear the tool description cache
 */
export function clearToolSearchDescriptionCache(): void {
  descriptionCache.clear()
}

/**
 * Parse tool name into searchable parts
 * Handles both MCP tools (mcp__server__action) and regular tools (CamelCase)
 */
function parseToolName(name: string): {
  parts: string[]
  full: string
  isMcp: boolean
} {
  // Check if it's an MCP tool
  if (name.startsWith('mcp__')) {
    const withoutPrefix = name.replace(/^mcp__/, '').toLowerCase()
    const parts = withoutPrefix.split('__').flatMap(p => p.split('_'))
    return {
      parts: parts.filter(Boolean),
      full: withoutPrefix.replace(/__/g, ' ').replace(/_/g, ' '),
      isMcp: true,
    }
  }

  // Regular tool - split by CamelCase and underscores
  const parts = name
    .replace(/([a-z])([A-Z])/g, '$1 $2') // CamelCase to spaces
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  return {
    parts,
    full: parts.join(' '),
    isMcp: false,
  }
}

/**
 * Get tool description, cached by tool name
 */
async function getToolDescription(tool: { name: string; prompt?: () => Promise<string> | string; searchHint?: string }): Promise<string> {
  if (descriptionCache.has(tool.name)) {
    return descriptionCache.get(tool.name)!
  }

  // Try to get from searchHint first (curated)
  if (tool.searchHint) {
    descriptionCache.set(tool.name, tool.searchHint)
    return tool.searchHint
  }

  // Try to get from prompt
  if (tool.prompt) {
    try {
      const prompt = await Promise.resolve(tool.prompt())
      descriptionCache.set(tool.name, prompt)
      return prompt
    } catch {
      // Ignore errors
    }
  }

  return ''
}

/**
 * Check if a tool is deferred (not immediately available)
 */
function isDeferredTool(tool: { name: string; shouldDefer?: boolean }): boolean {
  // MCP tools are generally deferred
  if (tool.name.startsWith('mcp__')) return true
  // Check for shouldDefer flag
  if ('shouldDefer' in tool && tool.shouldDefer === true) return true
  return false
}

/**
 * Find a tool by name in a list
 */
function findToolByName(tools: Array<{ name: string }>, name: string): { name: string } | undefined {
  return tools.find(t => t.name.toLowerCase() === name.toLowerCase())
}

/**
 * Escape regex special characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Pre-compile word-boundary regexes for all search terms
 */
function compileTermPatterns(terms: string[]): Map<string, RegExp> {
  const patterns = new Map<string, RegExp>()
  for (const term of terms) {
    if (!patterns.has(term)) {
      patterns.set(term, new RegExp(`\\b${escapeRegExp(term)}\\b`))
    }
  }
  return patterns
}

/**
 * Search for tools using keywords
 */
async function searchToolsWithKeywords(
  query: string,
  deferredTools: Array<{ name: string; searchHint?: string; prompt?: () => Promise<string> | string }>,
  allTools: Array<{ name: string; searchHint?: string; prompt?: () => Promise<string> | string }>,
  maxResults: number,
): Promise<string[]> {
  const queryLower = query.toLowerCase().trim()

  // Fast path: exact match
  const exactMatch = deferredTools.find(t => t.name.toLowerCase() === queryLower) ??
    allTools.find(t => t.name.toLowerCase() === queryLower)
  if (exactMatch) {
    return [exactMatch.name]
  }

  // MCP prefix search
  if (queryLower.startsWith('mcp__') && queryLower.length > 5) {
    const prefixMatches = deferredTools
      .filter(t => t.name.toLowerCase().startsWith(queryLower))
      .slice(0, maxResults)
      .map(t => t.name)
    if (prefixMatches.length > 0) {
      return prefixMatches
    }
  }

  const queryTerms = queryLower.split(/\s+/).filter(term => term.length > 0)

  // Partition into required (+prefixed) and optional terms
  const requiredTerms: string[] = []
  const optionalTerms: string[] = []
  for (const term of queryTerms) {
    if (term.startsWith('+') && term.length > 1) {
      requiredTerms.push(term.slice(1))
    } else {
      optionalTerms.push(term)
    }
  }

  const allScoringTerms = requiredTerms.length > 0 ? [...requiredTerms, ...optionalTerms] : queryTerms
  const termPatterns = compileTermPatterns(allScoringTerms)

  // Filter candidates that match ALL required terms
  let candidateTools = deferredTools
  if (requiredTerms.length > 0) {
    const matches = await Promise.all(
      deferredTools.map(async tool => {
        const parsed = parseToolName(tool.name)
        const description = await getToolDescription(tool)
        const descNormalized = description.toLowerCase()
        const hintNormalized = tool.searchHint?.toLowerCase() ?? ''
        const matchesAll = requiredTerms.every(term => {
          const pattern = termPatterns.get(term)!
          return (
            parsed.parts.includes(term) ||
            parsed.parts.some(part => part.includes(term)) ||
            pattern.test(descNormalized) ||
            (hintNormalized && pattern.test(hintNormalized))
          )
        })
        return matchesAll ? tool : null
      }),
    )
    candidateTools = matches.filter((t): t is typeof matches[number] => t !== null) as typeof deferredTools
  }

  // Score and rank candidates
  const scored = await Promise.all(
    candidateTools.map(async tool => {
      const parsed = parseToolName(tool.name)
      const description = await getToolDescription(tool)
      const descNormalized = description.toLowerCase()
      const hintNormalized = tool.searchHint?.toLowerCase() ?? ''

      let score = 0
      for (const term of allScoringTerms) {
        const pattern = termPatterns.get(term)!

        // Exact part match
        if (parsed.parts.includes(term)) {
          score += parsed.isMcp ? 12 : 10
        } else if (parsed.parts.some(part => part.includes(term))) {
          score += parsed.isMcp ? 6 : 5
        }

        // Full name fallback
        if (parsed.full.includes(term) && score === 0) {
          score += 3
        }

        // searchHint match
        if (hintNormalized && pattern.test(hintNormalized)) {
          score += 4
        }

        // Description match
        if (pattern.test(descNormalized)) {
          score += 2
        }
      }

      return { name: tool.name, score }
    }),
  )

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.name)
}

/**
 * Build the search result output structure
 */
function buildSearchResult(
  matches: string[],
  query: string,
  totalDeferredTools: number,
  pendingMcpServers?: string[],
): { data: Output } {
  return {
    data: {
      matches,
      query,
      total_deferred_tools: totalDeferredTools,
      ...(pendingMcpServers && pendingMcpServers.length > 0
        ? { pending_mcp_servers: pendingMcpServers }
        : {}),
    },
  }
}

// Check if tool search is enabled
function isToolSearchEnabled(): boolean {
  return process.env.QOOCODE_TOOL_SEARCH !== 'false'
}

export const ToolSearchTool = buildTool({
  name: 'ToolSearch',
  searchHint: 'search for deferred tools by keyword or select by name',
  maxResultSizeChars: 100_000,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isEnabled() {
    return isToolSearchEnabled()
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly() {
    return true
  },
  toAutoClassifierInput(input: z.infer<InputSchema>) {
    return `ToolSearch ${input.query}`
  },
  async description() {
    return 'Search for deferred tools by keyword or directly select them by name. ' +
      'Use "select:<tool_name>" to directly select a tool, or enter keywords to search. ' +
      'Returns matching tool names that can be used in subsequent tool calls.'
  },
  async prompt() {
    return 'Use ToolSearch to:\n' +
      '- Search for deferred tools using keywords (e.g., "github", "read file", "web fetch")\n' +
      '- Directly select a tool by name using "select:<tool_name>" syntax\n' +
      '- Find tools from MCP servers that are still connecting\n\n' +
      'This tool is useful when you need to discover or activate tools that are not immediately available.'
  },
  async checkPermissions(input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },
  async call(input: z.infer<InputSchema>, context: ToolUseContext) {
    const { query, max_results = 5 } = input

    // Get tools from context - in a real implementation these would come from appState
    // For now, we simulate with empty arrays
    const deferredTools: Array<{ name: string; searchHint?: string; prompt?: () => Promise<string> | string }> = []
    const allTools: Array<{ name: string; searchHint?: string; prompt?: () => Promise<string> | string }> = []
    const pendingMcpServers: string[] = []

    // Check for MCP servers still connecting
    // In production, this would check appState.mcp.clients
    // const pending = appState.mcp.clients.filter(c => c.type === 'pending')
    // pendingMcpServers = pending.map(s => s.name)

    // Check for select: prefix — direct tool selection
    const selectMatch = query.match(/^select:(.+)$/i)
    if (selectMatch) {
      const requested = selectMatch[1]!
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const found: string[] = []
      const missing: string[] = []
      for (const toolName of requested) {
        const tool = findToolByName(deferredTools, toolName) ?? findToolByName(allTools, toolName)
        if (tool) {
          if (!found.includes(tool.name)) found.push(tool.name)
        } else {
          missing.push(toolName)
        }
      }

      if (found.length === 0) {
        return buildSearchResult([], query, deferredTools.length, pendingMcpServers)
      }

      return buildSearchResult(found, query, deferredTools.length)
    }

    // Keyword search
    const matches = await searchToolsWithKeywords(query, deferredTools, allTools, max_results)

    // Include pending server info when search finds no matches
    if (matches.length === 0) {
      return buildSearchResult(matches, query, deferredTools.length, pendingMcpServers)
    }

    return buildSearchResult(matches, query, deferredTools.length)
  },
  mapToolResultToToolResultBlockParam(content: Output, toolUseID) {
    if (content.matches.length === 0) {
      let text = 'No matching deferred tools found'
      if (content.pending_mcp_servers && content.pending_mcp_servers.length > 0) {
        text += `. Some MCP servers are still connecting: ${content.pending_mcp_servers.join(', ')}. Their tools will become available shortly.`
      }
      return {
        tool_use_id: toolUseID,
        type: 'tool_result' as const,
        content: text,
      }
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: `Found ${content.matches.length} matching tool(s):\n${content.matches.map(name => `- ${name}`).join('\n')}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
