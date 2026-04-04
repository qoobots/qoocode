/**
 * Cache Command - 缓存管理命令
 */

import type { Command } from '../../types/message.js'
import { 
  clearAllCaches, 
  getCacheStats,
  type CacheStats 
} from '../../services/cache/cacheService.js'
import { 
  toolResultStorage,
  type ToolResultStats 
} from '../../services/storage/toolResultStorage.js'

export const cacheCmd: Command = {
  name: 'cache',
  aliases: ['cached'],
  description: 'Manage tool result cache',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const action = parts[0]?.toLowerCase() || 'info'

    // 显示缓存信息
    if (action === 'info' || action === 'status') {
      const stats = getCacheStats()
      const storageStats = await toolResultStorage.getStats()

      const lines = [
        '📦 Cache Status',
        '================',
        '',
        'Tool Result Cache:',
        `  Entries: ${stats.entries}`,
        `  Hits: ${stats.hits}`,
        `  Misses: ${stats.misses}`,
        `  Hit Rate: ${stats.hits + stats.misses > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) : 0}%`,
        `  Memory Size: ${formatBytes(stats.size)}`,
        '',
        'Tool Result Storage:',
        `  Total Results: ${storageStats.totalResults}`,
        `  Disk Size: ${formatBytes(storageStats.totalSize)}`,
        '',
      ]

      if (Object.keys(storageStats.byTool).length > 0) {
        lines.push('Results by Tool:')
        for (const [tool, count] of Object.entries(storageStats.byTool)) {
          lines.push(`  ${tool}: ${count}`)
        }
      }

      return lines.join('\n')
    }

    // 清空缓存
    if (action === 'clear' || action === 'clean') {
      await clearAllCaches()
      return '✅ Tool result cache cleared.\n\nUse /cache info to verify.'
    }

    // 清空工具结果存储
    if (action === 'clear-storage' || action === 'clear-results') {
      const deleted = await toolResultStorage.cleanup(0)
      return `✅ Cleaned up ${deleted} tool result records.`
    }

    // 清理过期缓存
    if (action === 'cleanup' || action === 'gc') {
      const deleted = await toolResultStorage.cleanup()
      return `✅ Cleaned up ${deleted} expired tool result records.`
    }

    // 显示帮助
    return `📦 Cache Commands
==================

Usage: /cache <command>

Commands:
  /cache info          - Show cache statistics
  /cache clear         - Clear tool result cache
  /cache cleanup       - Remove expired results (older than 7 days)
  /cache clear-storage - Remove all stored tool results

Examples:
  /cache info          - View cache usage
  /cache clear         - Free up memory cache
  /cache cleanup       - Free up disk space`
  },
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
