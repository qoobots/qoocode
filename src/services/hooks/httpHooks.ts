/**
 * HTTP Hooks Service - HTTP 请求钩子服务
 * 
 * 提供在 HTTP 请求前后执行的钩子功能，用于日志、监控、请求修改等
 */

import { z } from 'zod'

export type HttpHookEvent = 'pre-request' | 'post-request' | 'error'

export interface HttpHook {
  id: string
  name: string
  event: HttpHookEvent
  urlPattern?: string // URL 正则表达式模式
  method?: string[] // HTTP 方法
  enabled: boolean
  headers?: Record<string, string> // 要添加的请求头
  timeout?: number // 超时时间（毫秒）
  transform?: {
    request?: (data: unknown) => unknown // 请求数据转换
    response?: (data: unknown) => unknown // 响应数据转换
  }
  conditions?: {
    statusCode?: number[] // 触发条件的状态码
    error?: boolean // 仅在错误时触发
  }
}

export interface HttpRequestContext {
  url: string
  method: string
  headers?: Record<string, string>
  body?: unknown
  timestamp: number
}

export interface HttpResponseContext {
  url: string
  method: string
  statusCode: number
  headers?: Record<string, string>
  body?: unknown
  duration: number
  timestamp: number
  error?: string
}

export interface HttpHookResult {
  hook: HttpHook
  success: boolean
  output?: unknown
  error?: string
  duration: number
}

// HTTP Hook 配置
const HTTP_HOOKS_CONFIG_KEY = 'httpHooks'

/**
 * HTTP Hooks Manager
 */
class HttpHooksManager {
  private hooks: HttpHook[] = []
  private loaded = false

  /**
   * 加载 HTTP Hooks 配置
   */
  async load(config: Record<string, unknown> = {}): Promise<void> {
    if (this.loaded) return

    const hooksConfig = config[HTTP_HOOKS_CONFIG_KEY]
    if (hooksConfig && typeof hooksConfig === 'object') {
      const parsed = z.array(z.object({
        id: z.string(),
        name: z.string(),
        event: z.enum(['pre-request', 'post-request', 'error']),
        urlPattern: z.string().optional(),
        method: z.array(z.string()).optional(),
        enabled: z.boolean(),
        headers: z.record(z.string()).optional(),
        timeout: z.number().optional(),
        transform: z.object({
          request: z.function().optional(),
          response: z.function().optional(),
        }).optional(),
        conditions: z.object({
          statusCode: z.array(z.number()).optional(),
          error: z.boolean().optional(),
        }).optional(),
      })).safeParse(hooksConfig)

      if (parsed.success) {
        this.hooks = parsed.data
      }
    }

    this.loaded = true
  }

  /**
   * 获取所有启用的钩子
   */
  getHooks(): HttpHook[] {
    return this.hooks.filter(h => h.enabled)
  }

  /**
   * 获取匹配 URL 模式的钩子
   */
  getMatchingHooks(url: string, method: string, event: HttpHookEvent): HttpHook[] {
    return this.getHooks().filter(hook => {
      if (hook.event !== event) return false

      // 检查 HTTP 方法
      if (hook.method && hook.method.length > 0) {
        if (!hook.method.includes(method.toUpperCase())) return false
      }

      // 检查 URL 模式
      if (hook.urlPattern) {
        try {
          const regex = new RegExp(hook.urlPattern)
          if (!regex.test(url)) return false
        } catch {
          // 无效的正则表达式，跳过
          return false
        }
      }

      return true
    })
  }

  /**
   * 检查条件是否满足
   */
  checkConditions(hook: HttpHook, context: HttpResponseContext): boolean {
    if (!hook.conditions) return true

    const { conditions } = hook

    // 检查状态码
    if (conditions.statusCode && conditions.statusCode.length > 0) {
      if (!conditions.statusCode.includes(context.statusCode)) {
        return false
      }
    }

    // 检查错误
    if (conditions.error !== undefined) {
      const hasError = context.error !== undefined
      if (hasError !== conditions.error) {
        return false
      }
    }

    return true
  }

  /**
   * 执行预请求钩子
   */
  async executePreRequestHooks(
    context: HttpRequestContext
  ): Promise<{ context: HttpRequestContext; results: HttpHookResult[] }> {
    const matchingHooks = this.getMatchingHooks(context.url, context.method, 'pre-request')
    const results: HttpHookResult[] = []
    let modifiedContext = { ...context }

    for (const hook of matchingHooks) {
      const start = Date.now()

      try {
        // 应用钩子的请求头
        if (hook.headers) {
          modifiedContext.headers = {
            ...modifiedContext.headers,
            ...hook.headers,
          }
        }

        // 应用请求转换
        if (hook.transform?.request && modifiedContext.body) {
          modifiedContext.body = hook.transform.request(modifiedContext.body)
        }

        results.push({
          hook,
          success: true,
          duration: Date.now() - start,
        })
      } catch (error) {
        results.push({
          hook,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - start,
        })
      }
    }

    return { context: modifiedContext, results }
  }

  /**
   * 执行后请求钩子
   */
  async executePostRequestHooks(
    context: HttpResponseContext
  ): Promise<{ context: HttpResponseContext; results: HttpHookResult[] }> {
    const matchingHooks = this.getMatchingHooks(context.url, context.method, 'post-request')
    const results: HttpHookResult[] = []
    let modifiedContext = { ...context }

    for (const hook of matchingHooks) {
      // 检查条件
      if (!this.checkConditions(hook, context)) continue

      const start = Date.now()

      try {
        // 应用响应转换
        if (hook.transform?.response && modifiedContext.body) {
          modifiedContext.body = hook.transform.response(modifiedContext.body)
        }

        results.push({
          hook,
          success: true,
          duration: Date.now() - start,
        })
      } catch (error) {
        results.push({
          hook,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - start,
        })
      }
    }

    return { context: modifiedContext, results }
  }

  /**
   * 执行错误钩子
   */
  async executeErrorHooks(
    context: HttpResponseContext
  ): Promise<HttpHookResult[]> {
    const matchingHooks = this.getMatchingHooks(context.url, context.method, 'error')
    const results: HttpHookResult[] = []

    for (const hook of matchingHooks) {
      // 错误钩子通常不需要条件检查，因为已经有错误了
      const start = Date.now()

      try {
        // 这里可以添加错误通知、记录等功能
        results.push({
          hook,
          success: true,
          duration: Date.now() - start,
        })
      } catch (error) {
        results.push({
          hook,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - start,
        })
      }
    }

    return results
  }

  /**
   * 添加 HTTP Hook
   */
  addHook(hook: Omit<HttpHook, 'id'>): HttpHook {
    const id = `http-hook-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const newHook: HttpHook = { ...hook, id }
    this.hooks.push(newHook)
    return newHook
  }

  /**
   * 移除 HTTP Hook
   */
  removeHook(id: string): boolean {
    const index = this.hooks.findIndex(h => h.id === id)
    if (index !== -1) {
      this.hooks.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * 更新 HTTP Hook
   */
  updateHook(id: string, updates: Partial<HttpHook>): HttpHook | null {
    const hook = this.hooks.find(h => h.id === id)
    if (hook) {
      Object.assign(hook, updates)
      return hook
    }
    return null
  }

  /**
   * 获取钩子配置（用于保存）
   */
  getConfig(): Record<string, HttpHook[]> {
    return { [HTTP_HOOKS_CONFIG_KEY]: this.hooks }
  }
}

// 单例
let httpHooksManager: HttpHooksManager | null = null

export function getHttpHooksManager(): HttpHooksManager {
  if (!httpHooksManager) {
    httpHooksManager = new HttpHooksManager()
  }
  return httpHooksManager
}

export type { HttpHooksManager }
export default HttpHooksManager
