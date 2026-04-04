import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  url: z.string().url().describe('The URL to fetch content from'),
  fetchInfo: z.string().optional().describe('Specific information to extract from the page'),
})

type Input = z.infer<typeof inputSchema>

interface FetchResult {
  url: string
  content: string
  fetchInfo?: string
}

async function fetchUrl(url: string): Promise<FetchResult> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'QOOCODE/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()

    clearTimeout(timeoutId)

    // Simple HTML stripping for content extraction
    let extractedContent = text
    if (contentType.includes('text/html')) {
      extractedContent = extractTextFromHtml(text)
    }

    return {
      url,
      content: extractedContent,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

function extractTextFromHtml(html: string): string {
  // Remove script and style tags with their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '')

  // Replace block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n')
  text = text.replace(/<br\s*\/?>/gi, '\n')

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n\s*\n/g, '\n\n')

  return text.trim()
}

function findRelevantContent(content: string, query: string): string {
  const queryLower = query.toLowerCase()
  const lines = content.split('\n')

  // Find lines containing the query
  const relevantLines: { index: number; line: string }[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(queryLower)) {
      relevantLines.push({ index: i, line: lines[i] })
    }
  }

  if (relevantLines.length === 0) {
    // Return first 2000 chars if no specific match
    return content.slice(0, 2000) + (content.length > 2000 ? '\n...' : '')
  }

  // Return context around matches
  const contextAround = 3
  const startIdx = Math.max(0, relevantLines[0].index - contextAround)
  const endIdx = Math.min(content.length, relevantLines[relevantLines.length - 1].index + contextAround)

  let result = content.slice(startIdx, endIdx)
  if (startIdx > 0) result = '...' + result
  if (endIdx < content.length) result = result + '...'

  // Limit size
  return result.slice(0, 3000) + (result.length > 3000 ? '\n...' : '')
}

export const WebFetchTool = buildTool({
  name: 'WebFetch',
  aliases: ['fetch', 'curl', 'wget', 'webfetch'],
  description:
    'Fetch content from a URL. Can extract specific information or return the full page content.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      const result = await fetchUrl(input.url)

      let content = result.content

      // Extract specific information if requested
      if (input.fetchInfo) {
        content = findRelevantContent(content, input.fetchInfo)
        return {
          data: {
            url: input.url,
            fetchInfo: input.fetchInfo,
            extracted: true,
          },
          content: `Fetched from: ${input.url}\n\n${content}`,
        }
      }

      // Limit content size
      const maxChars = 8000
      if (content.length > maxChars) {
        content = content.slice(0, maxChars) + '\n\n[Content truncated...]'
      }

      return {
        data: {
          url: input.url,
          length: content.length,
        },
        content: `Fetched from: ${input.url}\n\n${content}`,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: {
          url: input.url,
          error: message,
        },
        content: `Error fetching ${input.url}: ${message}`,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `WebFetch(${input?.url ?? ''})`
  },
})
