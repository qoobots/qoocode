// SleepTool - Active mode wait tool
// Allows pausing and waiting for external events or time intervals
import { buildTool } from '../../Tool.js'
import type { ToolDef, ToolUseContext } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod'

const inputSchema = lazySchema(() =>
  z.strictObject({
    duration_seconds: z
      .number()
      .positive()
      .max(3600)
      .optional()
      .describe('Duration to sleep in seconds (max 3600 = 1 hour)'),
    until: z
      .string()
      .optional()
      .describe('ISO timestamp to wait until'),
    reason: z
      .string()
      .optional()
      .describe('Reason for sleeping (shown to user)'),
  })
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    slept_seconds: z.number(),
    woke_at: z.string(),
    reason: z.string().optional(),
  })
)
type OutputSchema = ReturnType<typeof outputSchema>

// Track active sleep sessions
interface SleepSession {
  id: string
  startedAt: number
  durationMs: number
  reason?: string
  resolve?: (value: unknown) => void
}

const activeSessions = new Map<string, SleepSession>()

/**
 * Create a new sleep session
 */
export function createSleepSession(
  durationMs: number,
  reason?: string
): { id: string; resolve?: (value: unknown) => void } {
  const id = `sleep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  let resolve: ((value: unknown) => void) | undefined
  
  const promise = new Promise<unknown>(r => { resolve = r })
  
  const session: SleepSession = {
    id,
    startedAt: Date.now(),
    durationMs,
    reason,
  }
  
  activeSessions.set(id, session)
  
  // Set timeout
  setTimeout(() => {
    wakeFromSleep(id)
  }, durationMs)
  
  return { id, resolve }
}

/**
 * Wake from a sleep session
 */
export function wakeFromSleep(id: string): boolean {
  const session = activeSessions.get(id)
  if (!session) return false
  
  activeSessions.delete(id)
  
  // In a real implementation, this would trigger a callback
  console.log(`[SleepTool] Woke from sleep session ${id} after ${session.durationMs}ms`)
  
  return true
}

/**
 * Cancel a sleep session
 */
export function cancelSleep(id: string): boolean {
  return activeSessions.delete(id)
}

/**
 * List active sleep sessions
 */
export function listActiveSleepSessions(): SleepSession[] {
  return Array.from(activeSessions.values())
}

/**
 * Parse ISO timestamp
 */
function parseTimestamp(timestamp: string): number | null {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return null
    return date.getTime()
  } catch {
    return null
  }
}

export const SleepTool = buildTool({
  name: 'Sleep',
  searchHint: 'pause and wait for time or events',
  maxResultSizeChars: 1000,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isEnabled() {
    return true
  },
  isConcurrencySafe() {
    return false // Modifies sleep state
  },
  isReadOnly() {
    return true // Doesn't modify files or external state
  },
  toAutoClassifierInput(input: z.infer<InputSchema>) {
    if (input.until) return `sleep until ${input.until}`
    if (input.duration_seconds) return `sleep ${input.duration_seconds}s`
    return 'sleep'
  },
  async description() {
    return 'Pause execution and wait for a specified duration or until a timestamp. ' +
      'Use this when you need to wait for external events, rate limits to reset, ' +
      'or timed operations. Maximum wait time is 1 hour.'
  },
  async prompt() {
    return 'Use Sleep to:\n' +
      '- Wait for rate limits to reset\n' +
      '- Pause for polling operations\n' +
      '- Wait for scheduled tasks\n' +
      '- Delay execution for any reason\n\n' +
      'Provide either duration_seconds or until timestamp.'
  },
  async checkPermissions(input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },
  async call(input: z.infer<InputSchema>, _context: ToolUseContext) {
    const { duration_seconds, until, reason } = input

    let durationMs: number

    // Calculate duration
    if (until) {
      const targetTime = parseTimestamp(until)
      if (targetTime === null) {
        throw new Error(`Invalid timestamp format: ${until}. Use ISO format (e.g., "2024-01-15T10:30:00Z")`)
      }
      durationMs = targetTime - Date.now()
      if (durationMs <= 0) {
        return {
          data: {
            slept_seconds: 0,
            woke_at: new Date().toISOString(),
            reason: 'Already past the target time',
          },
        }
      }
    } else if (duration_seconds) {
      durationMs = duration_seconds * 1000
    } else {
      throw new Error('Must provide either duration_seconds or until')
    }

    // Enforce maximum duration
    const maxDuration = 3600 * 1000 // 1 hour
    if (durationMs > maxDuration) {
      durationMs = maxDuration
    }

    // Create sleep session
    const { id } = createSleepSession(durationMs, reason)

    // Sleep
    await new Promise(resolve => setTimeout(resolve, durationMs))

    return {
      data: {
        slept_seconds: Math.round(durationMs / 1000),
        woke_at: new Date().toISOString(),
        reason,
      },
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    let content = `Slept for ${output.slept_seconds} seconds, woke at ${output.woke_at}`
    if (output.reason) {
      content += `\nReason: ${output.reason}`
    }
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content,
    }
  },
} satisfies ToolDef<InputSchema, z.infer<OutputSchema>>)
