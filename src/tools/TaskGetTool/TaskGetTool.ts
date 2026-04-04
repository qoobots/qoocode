// TaskGetTool - Get details of a specific task
import { z } from 'zod'
import { buildTool, type ToolDef, type ToolUseContext } from '../../Tool.js'
import { TASK_GET_TOOL_NAME } from './constants.js'
import { DESCRIPTION, getPrompt } from './prompt.js'
import type { TodoItem } from '../../state/AppState.js'

// Input schema
const inputSchema = z.object({
  taskId: z.string().describe('The ID of the task to retrieve'),
})
type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  task: z.object({
    id: z.string(),
    subject: z.string(),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed']),
    activeForm: z.string().optional(),
    owner: z.string().optional(),
    blockedBy: z.array(z.string()),
  }).nullable(),
})
type OutputSchema = z.infer<typeof outputSchema>

export type Output = z.infer<typeof outputSchema>

export const TaskGetTool = buildTool({
  name: TASK_GET_TOOL_NAME,
  searchHint: 'get task details by ID',
  maxResultSizeChars: 100_000,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return getPrompt()
  },
  get inputSchema(): InputSchema {
    return inputSchema
  },
  get outputSchema(): OutputSchema {
    return outputSchema
  },
  userFacingName() {
    return 'TaskGet'
  },
  isEnabled() {
    return true
  },
  async checkPermissions() {
    return { behavior: 'allow', updatedInput: {} }
  },
  async call({ taskId }: InputSchema, context: ToolUseContext) {
    const appState = context.getAppState()
    const todos = (appState.todos || []) as TodoItem[]
    
    // Find the task by index (convert taskId format: "task-{index}" or handle timestamp format)
    let task = null
    let taskIndex = -1
    
    // Try to parse as "task-{index}" format
    if (taskId.startsWith('task-')) {
      const parts = taskId.split('-')
      if (parts.length === 2) {
        taskIndex = parseInt(parts[1], 10)
      } else {
        // Search by timestamp prefix
        taskIndex = todos.findIndex((t, i) => `task-${i}` === taskId)
      }
    } else {
      taskIndex = parseInt(taskId, 10)
    }
    
    if (taskIndex >= 0 && taskIndex < todos.length) {
      const todo = todos[taskIndex]
      task = {
        id: `task-${taskIndex}`,
        subject: todo.content,
        description: todo.description || todo.content,
        status: todo.status,
        activeForm: todo.activeForm,
        owner: undefined as string | undefined,
        blockedBy: [] as string[],
      }
    }
    
    return { data: { task } }
  },
  mapToolResultToToolResultBlockParam(result: Output, toolUseId: string) {
    if (!result.task) {
      return {
        tool_use_id: toolUseId,
        type: 'tool_result',
        content: 'Task not found.',
      }
    }
    
    const t = result.task
    return {
      tool_use_id: toolUseId,
      type: 'tool_result',
      content: `Task #${t.id}: ${t.subject}\nStatus: ${t.status}${t.description ? `\nDescription: ${t.description}` : ''}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
