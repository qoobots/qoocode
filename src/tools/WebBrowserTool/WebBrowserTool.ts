import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'
import { 
  createBrowserEngine, 
  detectAvailableEngine, 
  type BrowserEngine,
  type BrowserPage,
  type BrowserEngineType,
  type BrowserConfig,
} from './browserEngine.js'

const inputSchema = z.object({
  url: z.string().url().describe('The URL to visit'),
  action: z.enum([
    'navigate', 
    'screenshot', 
    'extract', 
    'click', 
    'fill', 
    'scroll',
    'select',
    'hover',
    'type',
    'back',
    'forward',
    'reload',
    'evaluate',
    'cookies',
  ]).describe('Action to perform'),
  selector: z.string().optional().describe('CSS selector for element interaction'),
  text: z.string().optional().describe('Text to fill, search for, or evaluate'),
  value: z.string().optional().describe('Value for select or other actions'),
  waitFor: z.number().optional().describe('Time to wait in milliseconds'),
  options: z.object({
    fullPage: z.boolean().optional().describe('Screenshot full page'),
    encoding: z.enum(['base64', 'binary']).optional().describe('Screenshot encoding'),
    delay: z.number().optional().describe('Typing delay in ms'),
    state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional().describe('Wait state'),
  }).optional().describe('Additional options'),
  viewport: z.object({
    width: z.number().optional().describe('Viewport width'),
    height: z.number().optional().describe('Viewport height'),
  }).optional().describe('Viewport dimensions'),
  engine: z.enum(['fetch', 'puppeteer', 'playwright', 'auto']).optional().describe('Browser engine to use'),
})

type Input = z.infer<typeof inputSchema>

interface BrowserResult {
  url: string
  action: string
  success: boolean
  content?: string
  screenshot?: string
  error?: string
  metadata?: {
    title?: string
    description?: string
    links?: string[]
    images?: string[]
    engine?: BrowserEngineType
  }
  cookies?: Array<{ name: string; value: string; domain?: string }>
}

// Session management for browser instances
const browserSessions: Map<string, BrowserEngine> = new Map()

function getSessionId(url: string): string {
  // Create a simple session ID based on URL origin
  try {
    const urlObj = new URL(url)
    return urlObj.origin
  } catch {
    return url
  }
}

async function getOrCreateBrowser(
  sessionId: string, 
  engineType: BrowserEngineType,
  config?: BrowserConfig
): Promise<BrowserEngine> {
  let browser = browserSessions.get(sessionId)
  
  if (!browser) {
    browser = await createBrowserEngine(engineType, config)
    browserSessions.set(sessionId, browser)
  }
  
  return browser
}

// Enhanced HTML parser
function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text.length > 15000 ? text.substring(0, 15000) + '... [truncated]' : text
}

function extractMetadata(html: string) {
  const metadata: { title?: string; description?: string; links: string[]; images: string[] } = {
    links: [],
    images: [],
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (titleMatch) metadata.title = titleMatch[1].trim()

  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
  if (descMatch) metadata.description = descMatch[1].trim()

  const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi)
  for (const match of linkMatches) {
    if (match[1] && !match[1].startsWith('javascript:')) {
      metadata.links.push(match[1])
    }
  }

  const imgMatches = html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)
  for (const match of imgMatches) {
    if (match[1]) metadata.images.push(match[1])
  }

  return metadata
}

async function performBrowserAction(input: Input): Promise<BrowserResult> {
  const { url, action, selector, text, value, waitFor = 5000, options, viewport, engine } = input
  
  // Determine engine type
  let engineType: BrowserEngineType = 'fetch'
  if (engine === 'auto' || !engine) {
    engineType = await detectAvailableEngine()
  } else if (engine !== 'fetch') {
    engineType = engine
  }

  const config: BrowserConfig = {
    timeout: 30000,
    viewport,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  }

  const sessionId = getSessionId(url)

  // For fetch-only actions, use simple fetch
  if (engineType === 'fetch' && ['navigate', 'extract', 'cookies'].includes(action)) {
    return performFetchAction(input, engineType)
  }

  // For interactive actions, need browser engine
  try {
    const browser = await getOrCreateBrowser(sessionId, engineType, config)
    
    if (waitFor > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.min(waitFor, 10000)))
    }

    switch (action) {
      case 'navigate': {
        const page = await browser.goto(url)
        return {
          url,
          action,
          success: true,
          content: formatPageContent(page),
          metadata: {
            title: page.title,
            description: page.metadata.description,
            links: page.metadata.links.slice(0, 10),
            images: page.metadata.images.slice(0, 5),
            engine: engineType,
          },
        }
      }

      case 'screenshot': {
        const screenshot = await browser.screenshot({
          fullPage: options?.fullPage,
          encoding: options?.encoding as 'base64' | 'binary' || 'base64',
        })
        return {
          url,
          action,
          success: true,
          screenshot: `data:image/png;base64,${screenshot}`,
          metadata: { engine: engineType },
        }
      }

      case 'click': {
        if (!selector) return { url, action, success: false, error: 'Selector required for click action' }
        await browser.click(selector)
        return { url, action, success: true, content: `Clicked element: ${selector}` }
      }

      case 'fill': {
        if (!selector || !text) return { url, action, success: false, error: 'Selector and text required for fill action' }
        await browser.fill(selector, text)
        return { url, action, success: true, content: `Filled "${text}" into: ${selector}` }
      }

      case 'type': {
        if (!selector || !text) return { url, action, success: false, error: 'Selector and text required for type action' }
        await browser.type(selector, text, { delay: options?.delay })
        return { url, action, success: true, content: `Typed "${text}" into: ${selector}` }
      }

      case 'select': {
        if (!selector || !value) return { url, action, success: false, error: 'Selector and value required for select action' }
        await browser.select(selector, value)
        return { url, action, success: true, content: `Selected "${value}" in: ${selector}` }
      }

      case 'hover': {
        if (!selector) return { url, action, success: false, error: 'Selector required for hover action' }
        await browser.hover(selector)
        return { url, action, success: true, content: `Hovered over: ${selector}` }
      }

      case 'scroll': {
        if (selector) {
          await browser.evaluate(`document.querySelector('${selector}')?.scrollIntoView()`)
        } else {
          await browser.evaluate('window.scrollBy(0, window.innerHeight)')
        }
        return { url, action, success: true, content: selector ? `Scrolled to: ${selector}` : 'Scrolled down one page' }
      }

      case 'extract': {
        const content = await browser.content()
        const metadata = extractMetadata(content)
        
        let extracted = content
        if (selector) {
          extracted = await browser.innerHTML(selector).catch(() => 
            browser.evaluate((s: string) => document.querySelector(s)?.innerHTML || '', selector) as Promise<string>
          )
        } else if (text) {
          extracted = extractTextFromHtml(content)
          const lines = extracted.split('\n').filter(line => 
            line.toLowerCase().includes(text.toLowerCase())
          )
          extracted = lines.length > 0 ? lines.join('\n') : `No text found containing "${text}"`
        }
        
        return {
          url,
          action,
          success: true,
          content: extracted,
          metadata: { engine: engineType },
        }
      }

      case 'evaluate': {
        if (!text) return { url, action, success: false, error: 'Script required for evaluate action' }
        const result = await browser.evaluate(text)
        return {
          url,
          action,
          success: true,
          content: `Result: ${JSON.stringify(result)}`,
          metadata: { engine: engineType },
        }
      }

      case 'cookies': {
        const cookies = await browser.getCookies()
        return {
          url,
          action,
          success: true,
          content: `${cookies.length} cookies found`,
          cookies: cookies.map(c => ({ name: c.name, value: c.value, domain: c.domain })),
          metadata: { engine: engineType },
        }
      }

      case 'back': {
        const page = await browser.back()
        return { url: page.url, action, success: true, content: 'Navigated back' }
      }

      case 'forward': {
        const page = await browser.forward()
        return { url: page.url, action, success: true, content: 'Navigated forward' }
      }

      case 'reload': {
        const page = await browser.reload()
        return { url: page.url, action, success: true, content: 'Page reloaded' }
      }

      default:
        return { url, action, success: false, error: `Unknown action: ${action}` }
    }
  } catch (error) {
    return {
      url,
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

async function performFetchAction(input: Input, engineType: BrowserEngineType): Promise<BrowserResult> {
  const { url, action } = input
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    clearTimeout(timeoutId)

    const metadata = extractMetadata(html)

    if (action === 'cookies') {
      return {
        url,
        action,
        success: true,
        content: 'Cookie management not available in fetch mode',
        metadata: { engine: engineType },
      }
    }

    return {
      url,
      action,
      success: true,
      content: formatPageContent({ url, content: html, metadata }),
      metadata: {
        title: metadata.title,
        description: metadata.description,
        links: metadata.links.slice(0, 10),
        images: metadata.images.slice(0, 5),
        engine: engineType,
      },
    }
  } catch (error) {
    clearTimeout(timeoutId)
    return {
      url,
      action,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function formatPageContent(page: BrowserPage): string {
  const lines = [
    `Title: ${page.title || 'N/A'}`,
    '',
    page.metadata.description ? `Description: ${page.metadata.description}` : '',
    '',
    'Content:',
    extractTextFromHtml(page.content),
  ]
  
  return lines.filter(Boolean).join('\n')
}

export const WebBrowserTool = buildTool({
  name: 'WebBrowserTool',
  description: 'Browser automation tool for web navigation, content extraction, screenshots, and interaction. Supports fetch mode (basic) and browser automation (advanced with Puppeteer/Playwright).',
  inputSchema,
  handler: async (input: Input): Promise<ToolResult<BrowserResult>> => {
    try {
      const result = await performBrowserAction(input)
      
      return {
        content: [
          result.success 
            ? `✅ Browser action "${input.action}" completed (engine: ${result.metadata?.engine || 'fetch'})`
            : `❌ Browser action "${input.action}" failed`,
          '',
          result.content || '',
          '',
          result.screenshot ? `📸 [Screenshot captured]` : '',
          result.error ? `Error: ${result.error}` : '',
          '',
          result.metadata?.title ? `Title: ${result.metadata.title}` : '',
          result.metadata?.description ? `Description: ${result.metadata.description}` : '',
          result.metadata?.links && result.metadata.links.length > 0 
            ? `Links (${result.metadata.links.length}): ${result.metadata.links.slice(0, 3).join(', ')}...`
            : '',
          result.metadata?.images && result.metadata.images.length > 0 
            ? `Images: ${result.metadata.images.length} found`
            : '',
          result.cookies ? `Cookies: ${result.cookies.length} stored` : '',
        ].filter(Boolean).join('\n'),
        data: result,
      }
    } catch (error) {
      return {
        content: `❌ Failed to perform browser action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: {
          url: input.url,
          action: input.action,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }
    }
  },
  isEnabled: () => true,
  dangerous: true,
  permissionDescription: 'Allows web browsing, screenshots, and web interaction which can access external websites',
})

// Export for session management
export { browserSessions }
