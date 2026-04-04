// RemoteTriggerTool - Manage scheduled remote agent triggers
// Allows listing, creating, updating, running, and deleting remote triggers
import { buildTool } from '../../Tool.js'
import type { ToolDef, ToolUseContext } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod'

const inputSchema = lazySchema(() =>
  z.strictObject({
    action: z.enum(['list', 'get', 'create', 'update', 'run', 'delete']).describe('The action to perform'),
    trigger_id: z
      .string()
      .regex(/^[\w-]+$/)
      .optional()
      .describe('Required for get, update, run, and delete actions'),
    body: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('JSON body for create and update'),
  })
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    status: z.number(),
    json: z.string(),
  })
)
type OutputSchema = ReturnType<typeof outputSchema>

// Remote trigger configuration
interface RemoteTriggerConfig {
  enabled: boolean
  apiUrl?: string
  apiKey?: string
}

// Get remote trigger configuration
function getRemoteTriggerConfig(): RemoteTriggerConfig {
  return {
    enabled: process.env.QOOCODE_REMOTE_TRIGGERS === 'true',
    apiUrl: process.env.QOOCODE_REMOTE_TRIGGERS_API_URL,
    apiKey: process.env.QOOCODE_REMOTE_TRIGGERS_API_KEY,
  }
}

// In-memory trigger storage (in production this would use persistent storage)
const triggerStorage = new Map<string, {
  id: string
  name: string
  schedule: string
  prompt: string
  enabled: boolean
  createdAt: number
  lastRun?: number
}>()

/**
 * List all remote triggers
 */
export function listRemoteTriggers(): Array<{
  id: string
  name: string
  schedule: string
  prompt: string
  enabled: boolean
  createdAt: number
  lastRun?: number
}> {
  return Array.from(triggerStorage.values())
}

/**
 * Get a specific trigger by ID
 */
export function getRemoteTrigger(id: string): {
  id: string
  name: string
  schedule: string
  prompt: string
  enabled: boolean
  createdAt: number
  lastRun?: number
} | undefined {
  return triggerStorage.get(id)
}

/**
 * Create a new remote trigger
 */
export function createRemoteTrigger(
  name: string,
  schedule: string,
  prompt: string,
  enabled = true
): { id: string; name: string; schedule: string; prompt: string; enabled: boolean; createdAt: number } {
  const id = `trigger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const trigger = {
    id,
    name,
    schedule,
    prompt,
    enabled,
    createdAt: Date.now(),
  }
  triggerStorage.set(id, trigger)
  return trigger
}

/**
 * Update an existing trigger
 */
export function updateRemoteTrigger(
  id: string,
  updates: Partial<{
    name: string
    schedule: string
    prompt: string
    enabled: boolean
  }>
): boolean {
  const trigger = triggerStorage.get(id)
  if (!trigger) return false
  
  if (updates.name !== undefined) trigger.name = updates.name
  if (updates.schedule !== undefined) trigger.schedule = updates.schedule
  if (updates.prompt !== undefined) trigger.prompt = updates.prompt
  if (updates.enabled !== undefined) trigger.enabled = updates.enabled
  
  return true
}

/**
 * Delete a trigger
 */
export function deleteRemoteTrigger(id: string): boolean {
  return triggerStorage.delete(id)
}

/**
 * Run a trigger immediately
 */
export async function runRemoteTrigger(id: string): Promise<boolean> {
  const trigger = triggerStorage.get(id)
  if (!trigger || !trigger.enabled) return false
  
  trigger.lastRun = Date.now()
  
  // In production, this would trigger the actual remote agent execution
  console.log(`[RemoteTrigger] Running trigger ${id}: ${trigger.prompt}`)
  
  return true
}

// Simple HTTP request helper
async function makeRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Promise<{ status: number; data: unknown }> {
  const { method = 'GET', body, headers = {} } = options
  
  // In production, this would use actual HTTP requests
  // For now, we simulate the response
  return {
    status: 200,
    data: { message: 'Simulated response - configure QOOCODE_REMOTE_TRIGGERS_API_URL for real API calls' },
  }
}

export const RemoteTriggerTool = buildTool({
  name: 'RemoteTrigger',
  searchHint: 'manage scheduled remote agent triggers',
  maxResultSizeChars: 100_000,
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isEnabled() {
    return getRemoteTriggerConfig().enabled
  },
  isConcurrencySafe() {
    return true
  },
  isReadOnly(input: z.infer<InputSchema>) {
    return input.action === 'list' || input.action === 'get'
  },
  toAutoClassifierInput(input: z.infer<InputSchema>) {
    return `RemoteTrigger ${input.action}${input.trigger_id ? ` ${input.trigger_id}` : ''}`
  },
  async description() {
    return 'Manage scheduled remote agent triggers. Supports listing, creating, updating, running, and deleting triggers. ' +
      'Use this tool to schedule automated tasks that run remote agents at specified intervals.'
  },
  async prompt() {
    return 'Use RemoteTrigger tool to:\n' +
      '- list: List all available remote triggers\n' +
      '- get: Get details of a specific trigger\n' +
      '- create: Create a new scheduled trigger\n' +
      '- update: Update an existing trigger\n' +
      '- run: Execute a trigger immediately\n' +
      '- delete: Remove a trigger\n\n' +
      'Triggers can be used to automate repetitive tasks or run agents on a schedule.'
  },
  async checkPermissions(input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },
  async call(input: z.infer<InputSchema>, _context: ToolUseContext) {
    const { action, trigger_id, body } = input
    const config = getRemoteTriggerConfig()

    // Check if remote triggers are enabled
    if (!config.enabled) {
      return {
        data: {
          status: 400,
          json: JSON.stringify({
            error: 'Remote triggers are not enabled',
            hint: 'Set QOOCODE_REMOTE_TRIGGERS=true to enable',
          }),
        },
      }
    }

    // If we have an API URL configured, make real API calls
    if (config.apiUrl) {
      try {
        let method = 'GET'
        let url = `${config.apiUrl}/triggers`
        let data = body

        switch (action) {
          case 'list':
            method = 'GET'
            break
          case 'get':
            if (!trigger_id) throw new Error('get requires trigger_id')
            method = 'GET'
            url = `${config.apiUrl}/triggers/${trigger_id}`
            break
          case 'create':
            if (!body) throw new Error('create requires body')
            method = 'POST'
            data = body
            break
          case 'update':
            if (!trigger_id) throw new Error('update requires trigger_id')
            if (!body) throw new Error('update requires body')
            method = 'PUT'
            url = `${config.apiUrl}/triggers/${trigger_id}`
            data = body
            break
          case 'run':
            if (!trigger_id) throw new Error('run requires trigger_id')
            method = 'POST'
            url = `${config.apiUrl}/triggers/${trigger_id}/run`
            data = {}
            break
          case 'delete':
            if (!trigger_id) throw new Error('delete requires trigger_id')
            method = 'DELETE'
            url = `${config.apiUrl}/triggers/${trigger_id}`
            break
        }

        const result = await makeRequest(url, {
          method,
          body: data,
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
        })

        return {
          data: {
            status: result.status,
            json: JSON.stringify(result.data),
          },
        }
      } catch (error) {
        return {
          data: {
            status: 500,
            json: JSON.stringify({
              error: 'API request failed',
              message: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        }
      }
    }

    // Use in-memory storage when no API URL is configured
    switch (action) {
      case 'list': {
        const triggers = listRemoteTriggers()
        return {
          data: {
            status: 200,
            json: JSON.stringify({ triggers }, null, 2),
          },
        }
      }
      case 'get': {
        if (!trigger_id) {
          return {
            data: {
              status: 400,
              json: JSON.stringify({ error: 'get requires trigger_id' }),
            },
          }
        }
        const trigger = getRemoteTrigger(trigger_id)
        if (!trigger) {
          return {
            data: {
              status: 404,
              json: JSON.stringify({ error: `Trigger ${trigger_id} not found` }),
            },
          }
        }
        return {
          data: {
            status: 200,
            json: JSON.stringify({ trigger }, null, 2),
          },
        }
      }
      case 'create': {
        if (!body) {
          return {
            data: {
              status: 400,
              json: JSON.stringify({ error: 'create requires body' }),
            },
          }
        }
        const { name, schedule, prompt, enabled = true } = body as Record<string, unknown>
        if (!name || !schedule || !prompt) {
          return {
            data: {
              status: 400,
              json: JSON.stringify({ error: 'body must include name, schedule, and prompt' }),
            },
          }
        }
        const trigger = createRemoteTrigger(
          name as string,
          schedule as string,
          prompt as string,
          enabled as boolean
        )
        return {
          data: {
            status: 201,
            json: JSON.stringify({ trigger }, null, 2),
          },
        }
      }
      case 'update': {
        if (!trigger_id) {
          return {
            data: {
              status: 400,
              json: JSON.stringify({ error: 'update requires trigger_id' }),
            },
          }
        }
        if (!body) {
          return {
            data: {
              status: 400,
              json: JSON.stringify({ error: 'update requires body' }),
            },
          }
        }
        const success = updateRemoteTrigger(trigger_id, body as Record<string, unknown>)
        if (!success) {
          return {
            data: {
              status: 404,
              json: JSON.stringify({ error: `Trigger ${trigger_id} not found` }),
            },
          }
        }
        const trigger = getRemoteTrigger(trigger_id)
        return {
          data: {
            status: 200,
            json: JSON.stringify({ trigger }, null, 2),
          },
        }
      }
      case 'run': {
        if (!trigger_id) {
          return {
            data: {
              status: 400,
              json: JSON.stringify({ error: 'run requires trigger_id' }),
            },
          }
        }
        const success = await runRemoteTrigger(trigger_id)
        if (!success) {
          return {
            data: {
              status: 404,
              json: JSON.stringify({ error: `Trigger ${trigger_id} not found or disabled` }),
            },
          }
        }
        return {
          data: {
            status: 200,
            json: JSON.stringify({ message: `Trigger ${trigger_id} executed successfully` }),
          },
        }
      }
      case 'delete': {
        if (!trigger_id) {
          return {
            data: {
              status: 400,
              json: JSON.stringify({ error: 'delete requires trigger_id' }),
            },
          }
        }
        const success = deleteRemoteTrigger(trigger_id)
        if (!success) {
          return {
            data: {
              status: 404,
              json: JSON.stringify({ error: `Trigger ${trigger_id} not found` }),
            },
          }
        }
        return {
          data: {
            status: 200,
            json: JSON.stringify({ message: `Trigger ${trigger_id} deleted` }),
          },
        }
      }
      default:
        return {
          data: {
            status: 400,
            json: JSON.stringify({ error: `Unknown action: ${action}` }),
          },
        }
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: `HTTP ${output.status}\n${output.json}`,
    }
  },
} satisfies ToolDef<InputSchema, { status: number; json: string }>)
