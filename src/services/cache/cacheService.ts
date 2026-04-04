/**
 * CacheService - 工具结果缓存服务
 * 
 * 提供工具调用的结果缓存，提高重复调用的效率
 */

import { createHash } from 'crypto'
import { readFile, writeFile, mkdir, rm, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { homedir } from 'os'

export interface CacheEntry<T = unknown> {
  key: string
  value: T
  createdAt: number
  expiresAt: number | null
  size: number
}

export interface CacheStats {
  hits: number
  misses: number
  size: number
  entries: number
}

export interface CacheOptions {
  ttl?: number // 毫秒
  maxSize?: number // bytes
  directory?: string
}

const DEFAULT_TTL = 5 * 60 * 1000 // 5 分钟
const DEFAULT_MAX_SIZE = 100 * 1024 * 1024 // 100 MB

class CacheService {
  private memoryCache = new Map<string, CacheEntry>()
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, entries: 0 }
  private ttl: number
  private maxSize: number
  private cacheDir: string

  constructor(options: CacheOptions = {}) {
    this.ttl = options.ttl ?? DEFAULT_TTL
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE
    this.cacheDir = options.directory ?? join(homedir(), '.QOOCODE', 'cache')
  }

  /**
   * 生成缓存键
   */
  generateKey(toolName: string, input: unknown): string {
    const data = JSON.stringify({ tool: toolName, input })
    return createHash('sha256').update(data).digest('hex').slice(0, 32)
  }

  /**
   * 获取缓存值
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    // 先检查内存缓存
    const memEntry = this.memoryCache.get(key)
    if (memEntry) {
      if (this.isExpired(memEntry)) {
        this.memoryCache.delete(key)
      } else {
        this.stats.hits++
        return memEntry.value as T
      }
    }

    // 检查磁盘缓存
    try {
      const filePath = this.getCacheFilePath(key)
      const content = await readFile(filePath, 'utf-8')
      const entry = JSON.parse(content) as CacheEntry<T>

      if (this.isExpired(entry)) {
        await this.delete(key)
        this.stats.misses++
        return null
      }

      this.stats.hits++
      // 更新内存缓存
      this.memoryCache.set(key, entry)
      return entry.value
    } catch {
      this.stats.misses++
      return null
    }
  }

  /**
   * 设置缓存值
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now()
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      expiresAt: ttl ? now + ttl : (this.ttl ? now + this.ttl : null),
      size: Buffer.byteLength(JSON.stringify(value), 'utf-8'),
    }

    // 添加到内存缓存
    this.memoryCache.set(key, entry)
    this.updateStats()

    // 写入磁盘缓存
    try {
      await mkdir(this.cacheDir, { recursive: true })
      const filePath = this.getCacheFilePath(key)
      await writeFile(filePath, JSON.stringify(entry), 'utf-8')
    } catch (error) {
      console.error('Failed to write cache to disk:', error)
    }

    // 检查并清理超过大小限制的缓存
    await this.enforceMaxSize()
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key)
    try {
      const filePath = this.getCacheFilePath(key)
      await rm(filePath, { force: true })
    } catch {
      // Ignore
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    this.stats = { hits: 0, misses: 0, size: 0, entries: 0 }

    try {
      const files = await readdir(this.cacheDir)
      await Promise.all(
        files.map((file) => rm(join(this.cacheDir, file), { force: true }))
      )
    } catch {
      // Ignore
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats, entries: this.memoryCache.size }
  }

  /**
   * 获取缓存目录大小
   */
  async getSize(): Promise<number> {
    try {
      const files = await readdir(this.cacheDir)
      let totalSize = 0
      for (const file of files) {
        const stat = await Bun.file(join(this.cacheDir, file)).stat()
        totalSize += stat.size
      }
      return totalSize
    } catch {
      return 0
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt
  }

  private getCacheFilePath(key: string): string {
    return join(this.cacheDir, `${key}.json`)
  }

  private updateStats(): void {
    let totalSize = 0
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size
    }
    this.stats.size = totalSize
    this.stats.entries = this.memoryCache.size
  }

  private async enforceMaxSize(): Promise<void> {
    if (this.stats.size <= this.maxSize) return

    // 按创建时间排序，最旧的先删除
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)

    let freedSize = 0
    const targetSize = this.maxSize * 0.8 // 清理到 80%

    for (const [key, entry] of entries) {
      if (this.stats.size - freedSize <= targetSize) break
      freedSize += entry.size
      await this.delete(key)
    }
  }
}

// 导出单例
export const cacheService = new CacheService()

/**
 * 工具结果缓存装饰器
 */
export function cached<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: CacheOptions = {}
): T {
  const service = new CacheService(options)

  return (async (...args: Parameters<T>) => {
    const input = args.length > 0 ? args[0] : null
    const key = service.generateKey(fn.name, input)

    // 尝试获取缓存
    const cached = await service.get(key)
    if (cached !== null) {
      return cached
    }

    // 执行函数并缓存结果
    const result = await fn(...args)
    await service.set(key, result)
    return result
  }) as T
}

/**
 * 清除所有缓存
 */
export async function clearAllCaches(): Promise<void> {
  await cacheService.clear()
}

/**
 * 获取缓存统计
 */
export function getCacheStats(): CacheStats {
  return cacheService.getStats()
}
