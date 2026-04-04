/**
 * Browser Engine Abstraction
 * 
 * Provides a unified interface for browser automation with support for:
 * - Native fetch-based browsing (fallback)
 * - Puppeteer integration
 * - Playwright integration
 */

import { z } from 'zod'

export interface BrowserConfig {
  headless?: boolean
  viewport?: { width: number; height: number }
  userAgent?: string
  timeout?: number
}

export interface BrowserPage {
  url: string
  title?: string
  content: string
  screenshot?: string
  metadata: {
    description?: string
    links: string[]
    images: string[]
    scripts: string[]
    styles: string[]
  }
}

export interface ElementInfo {
  tagName: string
  text: string
  attributes: Record<string, string>
  visible: boolean
  enabled: boolean
}

export interface Cookie {
  name: string
  value: string
  domain?: string
  path?: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
}

// Browser engine types
export type BrowserEngineType = 'fetch' | 'puppeteer' | 'playwright'

// Engine interface
export interface BrowserEngine {
  type: BrowserEngineType
  
  // Navigation
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<BrowserPage>
  back(): Promise<BrowserPage>
  forward(): Promise<BrowserPage>
  reload(): Promise<BrowserPage>
  
  // Interaction
  click(selector: string): Promise<void>
  fill(selector: string, value: string): Promise<void>
  select(selector: string, value: string): Promise<void>
  hover(selector: string): Promise<void>
  type(selector: string, text: string, options?: { delay?: number }): Promise<void>
  press(key: string): Promise<void>
  
  // Content
  content(): Promise<string>
  innerHTML(selector: string): Promise<string>
  innerText(selector: string): Promise<string>
  getAttribute(selector: string, attribute: string): Promise<string | null>
  
  // Screenshot
  screenshot(options?: { fullPage?: boolean; encoding?: 'base64' | 'binary' }): Promise<string>
  
  // Evaluation
  evaluate<T>(fn: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>
  
  // Cookies
  setCookies(cookies: Cookie[]): Promise<void>
  getCookies(): Promise<Cookie[]>
  deleteCookies(names?: string[]): Promise<void>
  
  // Utils
  waitForSelector(selector: string, options?: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }): Promise<void>
  waitForNavigation(options?: { waitUntil?: string; timeout?: number }): Promise<void>
  waitForFunction(fn: string | ((...args: unknown[]) => boolean), ...args: unknown[]): Promise<void>
  
  // Cleanup
  close(): Promise<void>
}

// Detect available browser automation
export async function detectAvailableEngine(): Promise<BrowserEngineType> {
  // Check for Playwright
  try {
    const playwright = await import('playwright')
    if (playwright.chromium) {
      return 'playwright'
    }
  } catch {
    // Playwright not available
  }
  
  // Check for Puppeteer
  try {
    const puppeteer = await import('puppeteer')
    if (puppeteer.default || puppeteer.launch) {
      return 'puppeteer'
    }
  } catch {
    // Puppeteer not available
  }
  
  // Fall back to native fetch
  return 'fetch'
}

// Create browser engine
export async function createBrowserEngine(
  type?: BrowserEngineType,
  config?: BrowserConfig
): Promise<BrowserEngine> {
  const engineType = type || await detectAvailableEngine()
  
  switch (engineType) {
    case 'playwright':
      return createPlaywrightEngine(config)
    case 'puppeteer':
      return createPuppeteerEngine(config)
    default:
      return createFetchEngine(config)
  }
}

// Fetch-based engine (fallback)
class FetchEngine implements BrowserEngine {
  type: BrowserEngineType = 'fetch'
  
  constructor(private config?: BrowserConfig) {}
  
  async goto(url: string): Promise<BrowserPage> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(this.config?.timeout || 30000),
      headers: {
        'User-Agent': this.config?.userAgent || 'Mozilla/5.0',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const content = await response.text()
    const metadata = this.extractMetadata(content)
    
    return {
      url,
      title: metadata.title,
      content,
      metadata,
    }
  }
  
  async back(): Promise<BrowserPage> {
    throw new Error('Not supported in fetch mode')
  }
  
  async forward(): Promise<BrowserPage> {
    throw new Error('Not supported in fetch mode')
  }
  
  async reload(): Promise<BrowserPage> {
    throw new Error('Not supported in fetch mode')
  }
  
  async click(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async fill(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async select(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async hover(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async type(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async press(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async content(): Promise<string> {
    throw new Error('Not supported in fetch mode')
  }
  
  async innerHTML(): Promise<string> {
    throw new Error('Not supported in fetch mode')
  }
  
  async innerText(): Promise<string> {
    throw new Error('Not supported in fetch mode')
  }
  
  async getAttribute(): Promise<string | null> {
    throw new Error('Not supported in fetch mode')
  }
  
  async screenshot(): Promise<string> {
    throw new Error('Not supported in fetch mode')
  }
  
  async evaluate<T>(): Promise<T> {
    throw new Error('Not supported in fetch mode')
  }
  
  async setCookies(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async getCookies(): Promise<Cookie[]> {
    return []
  }
  
  async deleteCookies(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async waitForSelector(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async waitForNavigation(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async waitForFunction(): Promise<void> {
    throw new Error('Not supported in fetch mode')
  }
  
  async close(): Promise<void> {}
  
  private extractMetadata(html: string) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    const linkMatches = [...html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi)]
      .map(m => m[1])
      .filter(h => h && !h.startsWith('javascript:'))
    const imgMatches = [...html.matchAll(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi)]
      .map(m => m[1])
      .filter(s => s)
    
    return {
      title: titleMatch?.[1]?.trim(),
      description: descMatch?.[1]?.trim(),
      links: linkMatches,
      images: imgMatches,
      scripts: [],
      styles: [],
    }
  }
}

function createFetchEngine(config?: BrowserConfig): BrowserEngine {
  return new FetchEngine(config)
}

// Placeholder for Playwright engine
async function createPlaywrightEngine(_config?: BrowserConfig): Promise<BrowserEngine> {
  // This would use playwright when available
  console.warn('Playwright engine not implemented yet')
  return new FetchEngine(_config)
}

// Placeholder for Puppeteer engine
async function createPuppeteerEngine(_config?: BrowserConfig): Promise<BrowserEngine> {
  // This would use puppeteer when available
  console.warn('Puppeteer engine not implemented yet')
  return new FetchEngine(_config)
}

// Export schema for validation
export const browserConfigSchema = z.object({
  headless: z.boolean().optional(),
  viewport: z.object({
    width: z.number().min(1).max(3840),
    height: z.number().min(1).max(2160),
  }).optional(),
  userAgent: z.string().optional(),
  timeout: z.number().min(1000).max(120000).optional(),
})
