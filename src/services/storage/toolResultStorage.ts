/**
 * ToolResultStorage - 工具结果存储服务
 * 
 * 提供工具调用的持久化存储，支持会话恢复和历史查询
 */

import { readFile, writeFile, mkdir, rm, readdir, stat } from 'fs/promises'
import { join, dirname } from 'path'
import { homedir } from 'os'

export interface ToolResultRecord {
  id: string
  toolName: string
  input: unknown
  output: unknown
  timestamp: number
  sessionId: string
  duration?: number
  error?: string
}

export interface ToolResultQuery {
  toolName?: string
  sessionId?: string
  startTime?: number
  endTime?: number
  limit?: number
  offset?: number
}

export interface ToolResultStats {
  totalResults: number
  totalSize: number
  byTool: Record<string, number>
  oldestTimestamp?: number
  newestTimestamp?: number
}

const STORAGE_DIR = join(homedir(), '.qoocode', 'tool-results')

class ToolResultStorage {
  private initialized = false

  /**
   * 初始化存储目录
   */
  async initialize(): Promise<void> {
    if (this.initialized) return
    await mkdir(STORAGE_DIR, { recursive: true })
    this.initialized = true
  }

  /**
   * 生成结果 ID
   */
  private generateId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * 获取存储文件路径
   */
  private getFilePath(id: string): string {
    // 使用前 8 个字符作为子目录，避免单目录文件过多
    const prefix = id.slice(5, 13)
    return join(STORAGE_DIR, prefix, `${id}.json`)
  }

  /**
   * 保存工具结果
   */
  async save(result: Omit<ToolResultRecord, 'id'>): Promise<ToolResultRecord> {
    await this.initialize()

    const id = this.generateId()
    const record: ToolResultRecord = {
      id,
      ...result,
    }

    const filePath = this.getFilePath(id)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8')

    return record
  }

  /**
   * 获取工具结果
   */
  async get(id: string): Promise<ToolResultRecord | null> {
    await this.initialize()

    try {
      const filePath = this.getFilePath(id)
      const content = await readFile(filePath, 'utf-8')
      return JSON.parse(content) as ToolResultRecord
    } catch {
      return null
    }
  }

  /**
   * 查询工具结果
   */
  async query(query: ToolResultQuery = {}): Promise<ToolResultRecord[]> {
    await this.initialize()

    const results: ToolResultRecord[] = []
    const { toolName, sessionId, startTime, endTime, limit = 100, offset = 0 } = query

    try {
      // 遍历所有子目录
      const subdirs = await readdir(STORAGE_DIR)
      
      for (const subdir of subdirs) {
        const subdirPath = join(STORAGE_DIR, subdir)
        
        try {
          const files = await readdir(subdirPath)
          
          for (const file of files) {
            if (!file.endsWith('.json')) continue
            
            const filePath = join(subdirPath, file)
            const content = await readFile(filePath, 'utf-8')
            const record = JSON.parse(content) as ToolResultRecord

            // 应用过滤条件
            if (toolName && record.toolName !== toolName) continue
            if (sessionId && record.sessionId !== sessionId) continue
            if (startTime && record.timestamp < startTime) continue
            if (endTime && record.timestamp > endTime) continue

            results.push(record)
          }
        } catch {
          // 子目录可能不存在或无法访问
        }
      }

      // 按时间排序
      results.sort((a, b) => b.timestamp - a.timestamp)

      // 应用分页
      return results.slice(offset, offset + limit)
    } catch {
      return []
    }
  }

  /**
   * 删除工具结果
   */
  async delete(id: string): Promise<boolean> {
    await this.initialize()

    try {
      const filePath = this.getFilePath(id)
      await rm(filePath, { force: true })
      return true
    } catch {
      return false
    }
  }

  /**
   * 删除会话的所有结果
   */
  async deleteBySession(sessionId: string): Promise<number> {
    await this.initialize()

    let deletedCount = 0
    const results = await this.query({ sessionId, limit: 10000 })

    for (const result of results) {
      if (result.sessionId === sessionId) {
        await this.delete(result.id)
        deletedCount++
      }
    }

    return deletedCount
  }

  /**
   * 清理过期结果
   */
  async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    await this.initialize()

    const cutoff = Date.now() - maxAge
    let deletedCount = 0

    try {
      const subdirs = await readdir(STORAGE_DIR)

      for (const subdir of subdirs) {
        const subdirPath = join(STORAGE_DIR, subdir)
        
        try {
          const files = await readdir(subdirPath)
          
          for (const file of files) {
            if (!file.endsWith('.json')) continue
            
            const filePath = join(subdirPath, file)
            const stat = await Bun.file(filePath).stat()
            
            if (stat.mtimeMs < cutoff) {
              await rm(filePath, { force: true })
              deletedCount++
            }
          }
        } catch {
          // 子目录可能不存在或无法访问
        }
      }
    } catch {
      // 目录可能不存在
    }

    return deletedCount
  }

  /**
   * 获取存储统计
   */
  async getStats(): Promise<ToolResultStats> {
    await this.initialize()

    const stats: ToolResultStats = {
      totalResults: 0,
      totalSize: 0,
      byTool: {},
    }

    try {
      const subdirs = await readdir(STORAGE_DIR)

      for (const subdir of subdirs) {
        const subdirPath = join(STORAGE_DIR, subdir)
        
        try {
          const files = await readdir(subdirPath)
          
          for (const file of files) {
            if (!file.endsWith('.json')) continue
            
            const filePath = join(subdirPath, file)
            const fileStat = await Bun.file(filePath).stat()
            
            stats.totalSize += fileStat.size

            try {
              const content = await readFile(filePath, 'utf-8')
              const record = JSON.parse(content) as ToolResultRecord

              stats.totalResults++
              stats.byTool[record.toolName] = (stats.byTool[record.toolName] || 0) + 1

              if (!stats.oldestTimestamp || record.timestamp < stats.oldestTimestamp) {
                stats.oldestTimestamp = record.timestamp
              }
              if (!stats.newestTimestamp || record.timestamp > stats.newestTimestamp) {
                stats.newestTimestamp = record.timestamp
              }
            } catch {
              // 跳过无效文件
            }
          }
        } catch {
          // 子目录可能不存在
        }
      }
    } catch {
      // 目录可能不存在
    }

    return stats
  }

  /**
   * 清空所有存储
   */
  async clear(): Promise<void> {
    await this.initialize()

    try {
      const subdirs = await readdir(STORAGE_DIR)

      for (const subdir of subdirs) {
        const subdirPath = join(STORAGE_DIR, subdir)
        await rm(subdirPath, { recursive: true, force: true })
      }
    } catch {
      // 目录可能不存在
    }
  }
}

// 导出单例
export const toolResultStorage = new ToolResultStorage()
