import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  query: z.string().describe('The search query'),
  maxResults: z.number().optional().describe('Maximum number of results (default: 5)'),
  engine: z.enum(['google', 'bing', 'duckduckgo']).optional().describe('Search engine to use'),
})

type Input = z.infer<typeof inputSchema>

interface SearchResult {
  title: string
  url: string
  snippet: string
}

// Using DuckDuckGo instant answer API (no API key needed)
async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query)
  const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'QOOCODE/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`)
    }

    const data = await response.json() as {
      RelatedTopics?: Array<{
        Text?: string
        FirstURL?: string
      }>
    }

    const results: SearchResult[] = []

    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, maxResults)) {
        if (topic.Text && topic.FirstURL) {
          // Extract title from the text (first part before the dash)
          const titleMatch = topic.Text.match(/^(.+?)\s*[-–]\s*/)
          const title = titleMatch ? titleMatch[1].trim() : topic.Text.slice(0, 50)
          const snippet = topic.Text.slice(title.length + 3).trim()

          results.push({
            title,
            url: topic.FirstURL,
            snippet: snippet || 'No description available',
          })
        }
      }
    }

    return results
  } catch (error) {
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function searchWithGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
  // Note: Google requires API key for official search API
  // This uses a simple web scraping approach (may be blocked)
  const encodedQuery = encodeURIComponent(query)
  const url = `https://www.google.com/search?q=${encodedQuery}&num=${maxResults}`

  return [{
    title: 'Google Search',
    url,
    snippet: `Search query: "${query}". To use Google Search, you need a Google Search API key.`,
  }]
}

async function searchWithBing(query: string, maxResults: number): Promise<SearchResult[]> {
  // Note: Bing requires API key
  const encodedQuery = encodeURIComponent(query)
  const url = `https://www.bing.com/search?q=${encodedQuery}&count=${maxResults}`

  return [{
    title: 'Bing Search',
    url,
    snippet: `Search query: "${query}". To use Bing Search, you need a Bing Search API key.`,
  }]
}

export const WebSearchTool = buildTool({
  name: 'WebSearch',
  aliases: ['search', 'google', 'bing', 'ddg'],
  description:
    'Search the web for information. Returns a list of relevant results with titles and snippets.',
  inputSchema,
  maxResultSizeChars: 20_000,

  async call(input: Input): Promise<ToolResult> {
    const query = input.query.trim()
    const maxResults = input.maxResults ?? 5
    const engine = input.engine ?? 'duckduckgo'

    if (!query) {
      return {
        data: { error: 'Query is required' },
        content: 'Error: Please provide a search query.',
      }
    }

    try {
      let results: SearchResult[] = []

      switch (engine) {
        case 'google':
          results = await searchWithGoogle(query, maxResults)
          break
        case 'bing':
          results = await searchWithBing(query, maxResults)
          break
        case 'duckduckgo':
        default:
          results = await searchDuckDuckGo(query, maxResults)
          break
      }

      if (results.length === 0) {
        return {
          data: { query, results: [] },
          content: `🔍 Search results for "${query}"\n\nNo results found.`,
        }
      }

      const formattedResults = results
        .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   🔗 ${r.url}`)
        .join('\n\n')

      return {
        data: {
          query,
          engine,
          count: results.length,
          results,
        },
        content: `🔍 Search results for "${query}" (${engine})\n\n${formattedResults}`,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: { query, error: message },
        content: `🔍 Search error: ${message}`,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `WebSearch(${input?.query ?? ''})`
  },
})
