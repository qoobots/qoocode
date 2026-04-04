// TaskUpdateTool - Update a task's properties
import { z } from 'zod'
import { buildTool, type ToolDef, type ToolUseContext } from '../../Tool.js'
import { TASK_UPDATE_TOOL_NAME } from './constants.js'
import { DESCRIPTION, getPrompt } from './prompt.js'
import type { TodoItem } from '../../state/AppState.js'

// Input schema
const inputSchema = z.object({
  taskId: z.string().describe('The ID of the task to update'),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().describe('New status for the task'),
  subject: z.string().optional().describe('New title for the task'),
  description: z.string().optional().describe('New description'),
  activeForm: z.string().optional().describe('New active form for spinner display'),
  owner: z.string().optional().describe('Assign a team member to this task'),
  blockedBy: z.array(z.string()).optional().describe('Array of task IDs that must be completed before this task'),
  blocks: z.array(z.string()).optional().describe('Array of task IDs that this task blocks'),
})
type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  task: z.object({
    id: z.string(),
    subject: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed']),
  }),
})
type OutputSchema = z.infer<typeof outputSchema>

export type Output = z.infer<typeof outputSchema>

export const TaskUpdateTool = buildTool({
  name: TASK_UPDATE_TOOL_NAME,
  searchHint: 'update task status or properties',
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
    return 'TaskUpdate'
  },
  isEnabled() {
    return true
  },
  async checkPermissions() {
    return { behavior: 'allow', updatedInput: {} }
  },
  async call({ taskId, status, subject, description, activeForm }: InputSchema, context: ToolUseContext) {
    const appState = context.getAppState()
    const todos = (appState.todos || []) as TodoItem[]
    
    // Find task index
    let taskIndex = -1
    if (taskId.startsWith('task-')) {
      const parts = taskId.split('-')
      if (parts.length === 2) {
        taskIndex = parseInt(parts[1], 10)
      } else {
        taskIndex = todos.findIndex((t, i) => `task-${i}` === taskId)
      }
    } else {
      taskIndex = parseInt(taskId, 10)
    }
    
    if (taskIndex < 0 || taskIndex >= todos.length) {
      throw new Error(`Task not found: ${taskId}`)
    }
    
    // Update the task
    const updatedTodos = [...todos]
    const currentTodo = updatedTodos[taskIndex]
    
    updatedTodos[taskIndex] = {
      ...currentTodo,
      content: subject !== undefined ? subject : currentTodo.content,
      status: status !== undefined ? status : currentTodo.status,
      activeForm: activeForm !== undefined ? activeForm : currentTodo.activeForm,
      description: description !== undefined ? description : currentTodo.description,
    }
    
    // Update app state
    context.setAppState((prev) => ({
      ...prev,
      todos: updatedTodos,
    }))

    return {
      data: {
        task: {
          id: `task-${taskIndex}`,
          subject: updatedTodos[taskIndex].content,
          status: updatedTodos[taskIndex].status,
        },
      },
    }
  },
  mapToolResultToToolResultBlockParam(result: Output, toolUseId: string) {
    return {
      tool_use_id: toolUseId,
      type: 'tool_result',
      content: `Task updated: ${result.task.subject} [${result.task.status}]`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
