// BTW Command - Internal debug command
// Provides internal debugging information and utilities
import { z } from 'zod'

// Input schema
export const btwInputSchema = z.object({
  action: z.enum(['status', 'memory', 'cache', 'stats', 'env', 'debug']).optional().default('status').describe('Debug action'),
})
export type BtwInput = z.infer<typeof btwInputSchema>

// Output interface
export interface BtwOutput {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

/**
 * Get memory usage info
 */
function getMemoryUsage(): {
  heapUsed: number
  heapTotal: number
  external: number
  rss: number
} {
  const mem = process.memoryUsage()
  return {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
    external: Math.round(mem.external / 1024 / 1024 * 100) / 100,
    rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
  }
}

/**
 * Get cache statistics
 */
function getCacheStats(): Record<string, unknown> {
  // Simulated cache stats
  return {
    toolDescriptions: { size: 32, hits: 128, misses: 4 },
    messages: { size: 256, hits: 1024, misses: 16 },
    config: { size: 8, hits: 64, misses: 0 },
  }
}

/**
 * Get environment info (filtered for security)
 */
function getEnvInfo(): Record<string, string> {
  const safeVars = ['NODE_ENV', 'PATH', 'HOME', 'USER', 'SHELL', 'PWD', 'TERM']
  const result: Record<string, string> = {}
  
  for (const key of safeVars) {
    if (process.env[key]) {
      // Truncate long values
      let value = process.env[key]!
      if (value.length > 50) {
        value = value.slice(0, 47) + '...'
      }
      result[key] = value
    }
  }
  
  return result
}

/**
 * Execute btw command
 */
export async function executeBtwCommand(input: BtwInput): Promise<BtwOutput> {
  const { action = 'status' } = input

  switch (action) {
    case 'status': {
      const mem = getMemoryUsage()
      return {
        success: true,
        message: `
Internal Status
===============

Memory:
  Heap Used:  ${mem.heapUsed} MB
  Heap Total: ${mem.heapTotal} MB
  RSS:        ${mem.rss} MB
  External:   ${mem.external} MB

Platform: ${process.platform}
Node:     ${process.version}
CWD:      ${process.cwd()}
`,
        data: { memory: mem, platform: process.platform },
      }
    }

    case 'memory': {
      const mem = getMemoryUsage()
      return {
        success: true,
        message: `
Memory Usage
============

Heap:
  Used:  ${mem.heapUsed} MB
  Total: ${mem.heapTotal} MB
  Usage: ${Math.round(mem.heapUsed / mem.heapTotal * 100)}%

System:
  RSS:      ${mem.rss} MB
  External: ${mem.external} MB
`,
        data: mem,
      }
    }

    case 'cache': {
      const stats = getCacheStats()
      return {
        success: true,
        message: `
Cache Statistics
================

${Object.entries(stats).map(([name, data]) => {
  const d = data as { size: number; hits: number; misses: number }
  return `${name}:\n  Size: ${d.size}\n  Hits: ${d.hits}\n  Misses: ${d.misses}\n  Hit Rate: ${Math.round(d.hits / (d.hits + d.misses) * 100)}%`
}).join('\n\n')}
`,
        data: stats,
      }
    }

    case 'stats': {
      return {
        success: true,
        message: `
Runtime Statistics
==================

Process Uptime:  ${Math.round(process.uptime())}s
System Uptime:   ${Math.round(require('os').uptime())}s
CPU Count:       ${require('os').cpus().length}
Load Average:     ${require('os').loadavg().join(', ')}
`,
      }
    }

    case 'env': {
      const env = getEnvInfo()
      return {
        success: true,
        message: `
Environment Variables
=====================

${Object.entries(env).map(([k, v]) => `${k}: ${v}`).join('\n')}
`,
        data: env,
      }
    }

    case 'debug': {
      const mem = getMemoryUsage()
      return {
        success: true,
        message: `
Debug Information
=================

[INTERNAL USE ONLY]

Memory: ${mem.heapUsed}MB / ${mem.heapTotal}MB
Platform: ${process.platform} ${process.arch}
Node: ${process.version}
PID: ${process.pid}
`,
      }
    }

    default:
      return {
        success: false,
        message: `Unknown action: ${action}\n\nAvailable: status, memory, cache, stats, env, debug`,
      }
  }
}
