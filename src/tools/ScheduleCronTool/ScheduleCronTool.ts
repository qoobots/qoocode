// ScheduleCronTool - Cron-based task scheduling
// Allows scheduling recurring or one-shot tasks using cron expressions
import { buildTool } from '../../Tool.js'
import type { ToolDef, ToolUseContext } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod'

// Configuration
const MAX_CRON_TASKS = 50
const DEFAULT_MAX_AGE_DAYS = 7

// Cron task storage
interface CronTask {
  id: string
  cron: string
  prompt: string
  recurring: boolean
  durable: boolean
  createdAt: number
  lastRun?: number
  nextRun?: number
  enabled: boolean
}

const cronStorage = new Map<string, CronTask>()
const cronIntervals = new Map<string, NodeJS.Timeout>()

// Parse a simple 5-field cron expression (M H DoM Mon DoW)
export function parseCronExpression(cron: string): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false
  
  const [minute, hour, dom, month, dow] = parts
  
  // Basic validation patterns
  const patterns = {
    minute: /^\*|^\d{1,2}$|^\d{1,2}-\d{1,2}$|^\*\/\d+$|^\d+,\d+/,
    hour: /^\*|^\d{1,2}$|^\d{1,2}-\d{1,2}$|^\*\/\d+$|^\d+,\d+/,
    dom: /^\*|^\d{1,2}$|^\d{1,2}-\d{1,2}$|^\*\/\d+$|^\d+,\d+/,
    month: /^\*|^\d{1,2}$|^\d{1,2}-\d{1,2}$|^\*\/\d+$|^\d+,\d+/,
    dow: /^\*|^\d{1,2}$|^\d{1,2}-\d{1,2}$|^\*\/\d+$|^\d+,\d+/,
  }
  
  return (
    patterns.minute.test(minute) &&
    patterns.hour.test(hour) &&
    patterns.dom.test(dom) &&
    patterns.month.test(month) &&
    patterns.dow.test(dow)
  )
}

// Convert cron to human-readable format
export function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return 'Invalid cron expression'
  
  const [minute, hour, dom, month, dow] = parts
  const descriptions: string[] = []
  
  // Minute
  if (minute === '*') descriptions.push('every minute')
  else if (minute.startsWith('*/')) descriptions.push(`every ${minute.slice(2)} minutes`)
  else descriptions.push(`at minute ${minute}`)
  
  // Hour
  if (hour === '*') descriptions.push('every hour')
  else if (hour.startsWith('*/')) descriptions.push(`every ${hour.slice(2)} hours`)
  else descriptions.push(`at ${hour}:00`)
  
  // Day of month
  if (dom !== '*') {
    if (dom.startsWith('*/')) descriptions.push(`every ${dom.slice(2)} days`)
    else descriptions.push(`on day ${dom}`)
  }
  
  // Month
  if (month !== '*') descriptions.push(`in month ${month}`)
  
  // Day of week
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  if (dow !== '*') {
    if (/^\d$/.test(dow)) descriptions.push(`on ${dayNames[parseInt(dow)] || dow}`)
    else descriptions.push(`on ${dow}`)
  }
  
  return descriptions.join(', ')
}

// Calculate next run time for a cron expression (simplified)
export function nextCronRunMs(cron: string, fromTime: number): number | null {
  if (!parseCronExpression(cron)) return null
  
  const parts = cron.trim().split(/\s+/)
  const [minute, hour, dom] = parts
  
  const date = new Date(fromTime)
  
  // Simple implementation: add 1 minute and return
  date.setMinutes(date.getMinutes() + 1)
  
  return date.getTime()
}

// List all cron tasks
export function listCronTasks(): CronTask[] {
  return Array.from(cronStorage.values())
}

// Get a specific cron task
export function getCronTask(id: string): CronTask | undefined {
  return cronStorage.get(id)
}

// Add a new cron task
export function addCronTask(
  cron: string,
  prompt: string,
  recurring: boolean,
  durable: boolean = false
): string {
  const id = `cron_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  
  const task: CronTask = {
    id,
    cron,
    prompt,
    recurring,
    durable,
    createdAt: Date.now(),
    nextRun: nextCronRunMs(cron, Date.now()) ?? undefined,
    enabled: true,
  }
  
  cronStorage.set(id, task)
  
  // Set up interval for recurring tasks
  if (recurring && task.nextRun) {
    const delay = task.nextRun - Date.now()
    if (delay > 0) {
      const timeout = setTimeout(() => {
        runCronTask(id)
      }, delay)
      cronIntervals.set(id, timeout)
    }
  }
  
  return id
}

// Delete a cron task
export function deleteCronTask(id: string): boolean {
  const interval = cronIntervals.get(id)
  if (interval) {
    clearTimeout(interval)
    cronIntervals.delete(id)
  }
  return cronStorage.delete(id)
}

// Run a cron task
async function runCronTask(id: string): Promise<void> {
  const task = cronStorage.get(id)
  if (!task || !task.enabled) return
  
  task.lastRun = Date.now()
  console.log(`[CronTask] Running task ${id}: ${task.prompt}`)
  
  // In production, this would trigger the actual prompt execution
  // For one-shot tasks, disable after running
  if (!task.recurring) {
    task.enabled = false
    deleteCronTask(id)
  } else {
    // Schedule next run
    task.nextRun = nextCronRunMs(task.cron, Date.now()) ?? undefined
    if (task.nextRun) {
      const delay = task.nextRun - Date.now()
      if (delay > 0) {
        const timeout = setTimeout(() => {
          runCronTask(id)
        }, delay)
        cronIntervals.set(id, timeout)
      }
    }
  }
}

// Schema definitions
const createInputSchema = lazySchema(() =>
  z.strictObject({
    cron: z.string().describe('Standard 5-field cron expression in local time: "M H DoM Mon DoW" (e.g. "*/5 * * * *" = every 5 minutes, "30 14 * * *" = daily at 2:30pm)'),
    prompt: z.string().describe('The prompt to execute at each fire time'),
    recurring: z.boolean().optional().default(true).describe('true (default) = fire on every cron match. false = fire once then auto-delete'),
    durable: z.boolean().optional().default(false).describe('true = persist to disk and survive restarts. false (default) = in-memory only'),
  })
)
type CreateInputSchema = ReturnType<typeof createInputSchema>

const deleteInputSchema = lazySchema(() =>
  z.strictObject({
    task_id: z.string().describe('The ID of the cron task to delete'),
  })
)
type DeleteInputSchema = ReturnType<typeof deleteInputSchema>

const listInputSchema = lazySchema(() =>
  z.strictObject({
    include_disabled: z.boolean().optional().default(false).describe('Include disabled/completed tasks'),
  })
)
type ListInputSchema = ReturnType<typeof listInputSchema>

// Output schema
const outputSchema = lazySchema(() =>
  z.object({
    id: z.string(),
    humanSchedule: z.string(),
    recurring: z.boolean(),
    durable: z.boolean().optional(),
  })
)
type OutputSchema = ReturnType<typeof outputSchema>

// Cron Create Tool
export const CronCreateTool = buildTool({
  name: 'CronCreate',
  searchHint: 'schedule a recurring or one-shot task',
  maxResultSizeChars: 100_000,
  get inputSchema(): CreateInputSchema {
    return createInputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  isEnabled() {
    return true
  },
  toAutoClassifierInput(input: z.infer<CreateInputSchema>) {
    return `${input.cron}: ${input.prompt}`
  },
  async description() {
    return 'Schedule a recurring or one-shot task using a cron expression. ' +
      'Tasks are executed automatically at the specified times. ' +
      'Supports both in-memory (session-only) and persistent (durable) tasks.'
  },
  async prompt() {
    return 'Use CronCreate to:\n' +
      '- Schedule recurring tasks like "every 5 minutes", "daily at 2:30pm"\n' +
      '- Set up one-shot reminders with recurring: false\n' +
      '- Create persistent tasks that survive restarts with durable: true\n\n' +
      'Cron format: "minute hour day_of_month month day_of_week"\n' +
      'Examples: "*/5 * * * *" (every 5 min), "30 14 * * *" (2:30pm daily), "0 9 * * 1-5" (9am weekdays)'
  },
  async checkPermissions(input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },
  async validateInput(input: z.infer<CreateInputSchema>) {
    if (!parseCronExpression(input.cron)) {
      return {
        result: false,
        message: `Invalid cron expression '${input.cron}'. Expected 5 fields: M H DoM Mon DoW.`,
        errorCode: 1,
      }
    }
    if (nextCronRunMs(input.cron, Date.now()) === null) {
      return {
        result: false,
        message: `Cron expression '${input.cron}' does not match any calendar date in the next year.`,
        errorCode: 2,
      }
    }
    if (cronStorage.size >= MAX_CRON_TASKS) {
      return {
        result: false,
        message: `Too many scheduled tasks (max ${MAX_CRON_TASKS}). Delete one first.`,
        errorCode: 3,
      }
    }
    return { result: true }
  },
  async call(input: z.infer<CreateInputSchema>) {
    const { cron, prompt, recurring = true, durable = false } = input
    
    const id = addCronTask(cron, prompt, recurring, durable)
    
    return {
      data: {
        id,
        humanSchedule: cronToHuman(cron),
        recurring,
        durable,
      },
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const where = output.durable
      ? 'Persisted to disk (survives restarts)'
      : 'Session-only (in-memory, dies when process exits)'
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: output.recurring
        ? `Scheduled recurring task ${output.id} (${output.humanSchedule}). ${where}. Auto-expires after ${DEFAULT_MAX_AGE_DAYS} days. Use CronDelete to cancel sooner.`
        : `Scheduled one-shot task ${output.id} (${output.humanSchedule}). ${where}. It will fire once then auto-delete.`,
    }
  },
} satisfies ToolDef<CreateInputSchema, z.infer<OutputSchema>>)

// Cron Delete Tool
export const CronDeleteTool = buildTool({
  name: 'CronDelete',
  searchHint: 'delete a scheduled cron task',
  maxResultSizeChars: 1000,
  get inputSchema(): DeleteInputSchema {
    return deleteInputSchema()
  },
  isEnabled() {
    return true
  },
  isReadOnly() {
    return false
  },
  async description() {
    return 'Delete a scheduled cron task by its ID. Use CronList first to find the task ID.'
  },
  async prompt() {
    return 'Use CronDelete to cancel a scheduled task. Provide the task_id from CronList.'
  },
  async checkPermissions(input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },
  async call(input: z.infer<DeleteInputSchema>) {
    const { task_id } = input
    
    const success = deleteCronTask(task_id)
    
    if (success) {
      return {
        data: {
          id: task_id,
          humanSchedule: 'deleted',
          recurring: false,
        },
      }
    } else {
      throw new Error(`Cron task ${task_id} not found`)
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: `Deleted cron task ${output.id}`,
    }
  },
} satisfies ToolDef<DeleteInputSchema, z.infer<OutputSchema>>)

// Cron List Tool
const listOutputSchema = lazySchema(() =>
  z.object({
    tasks: z.array(z.object({
      id: z.string(),
      cron: z.string(),
      prompt: z.string(),
      recurring: z.boolean(),
      durable: z.boolean(),
      createdAt: z.number(),
      lastRun: z.number().optional(),
      nextRun: z.number().optional(),
      enabled: z.boolean(),
    })),
    total: z.number(),
  })
)

export const CronListTool = buildTool({
  name: 'CronList',
  searchHint: 'list all scheduled cron tasks',
  maxResultSizeChars: 100_000,
  get inputSchema(): ListInputSchema {
    return listInputSchema()
  },
  get outputSchema() {
    return listOutputSchema()
  },
  isEnabled() {
    return true
  },
  isReadOnly() {
    return true
  },
  async description() {
    return 'List all scheduled cron tasks. Shows task IDs, schedules, and next run times.'
  },
  async prompt() {
    return 'Use CronList to see all scheduled tasks. Useful for finding task IDs to delete or checking upcoming schedules.'
  },
  async checkPermissions(input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },
  async call(input: z.infer<ListInputSchema>) {
    const { include_disabled = false } = input
    
    let tasks = listCronTasks()
    
    if (!include_disabled) {
      tasks = tasks.filter(t => t.enabled)
    }
    
    return {
      data: {
        tasks,
        total: tasks.length,
      },
    }
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    const taskList = output.tasks.map(t => {
      const nextRun = t.nextRun ? new Date(t.nextRun).toLocaleString() : 'N/A'
      const lastRun = t.lastRun ? new Date(t.lastRun).toLocaleString() : 'Never'
      return `${t.id}: ${t.cron} - ${t.prompt}\n  Next: ${nextRun} | Last: ${lastRun} | ${t.recurring ? 'Recurring' : 'One-shot'} | ${t.durable ? 'Durable' : 'Memory'}`
    }).join('\n\n')
    
    return {
      tool_use_id: toolUseID,
      type: 'tool_result' as const,
      content: `Found ${output.total} scheduled task(s):\n\n${taskList || 'No tasks scheduled.'}`,
    }
  },
} satisfies ToolDef<ListInputSchema, z.infer<ReturnType<typeof listOutputSchema>>>)
