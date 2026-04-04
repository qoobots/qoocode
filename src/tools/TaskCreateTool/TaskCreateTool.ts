// TaskCreateTool - Create a new task in the task list
import { z } from 'zod'
import { buildTool, type ToolDef, type ToolUseContext } from '../../Tool.js'
import { TASK_CREATE_TOOL_NAME } from './constants.js'
import { DESCRIPTION, getPrompt } from './prompt.js'
import type { TodoItem } from '../../state/AppState.js'

// Input schema
const inputSchema = z.object({
  subject: z.string().describe('A brief title for the task'),
  description: z.string().describe('What needs to be done'),
  activeForm: z.string().optional().describe('Present continuous form shown in spinner when in_progress (e.g., "Running tests")'),
})
type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  task: z.object({
    id: z.string(),
    subject: z.string(),
  }),
})
type OutputSchema = z.infer<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const TaskCreateTool = buildTool({
  name: TASK_CREATE_TOOL_NAME,
  searchHint: 'create a task in the task list',
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
    return 'TaskCreate'
  },
  isEnabled() {
    return true
  },
  async checkPermissions() {
    return { behavior: 'allow', updatedInput: {} }
  },
  async call({ subject, description, activeForm }: InputSchema, context: ToolUseContext) {
    // Get current todos from app state
    const appState = context.getAppState()
    const todos = (appState.todos || []) as TodoItem[]
    
    // Generate task ID
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    // Create new task
    const newTask: TodoItem = {
      content: subject,
      status: 'pending',
      activeForm: activeForm || subject,
      description: description,
    }
    
    // Add to todos
    const newTodos = [...todos, newTask]
    
    // Update app state
    context.setAppState((prev) => ({
      ...prev,
      todos: newTodos,
    }))

    return {
      data: {
        task: {
          id: taskId,
          subject,
        },
      },
    }
  },
  mapToolResultToToolResultBlockParam(result: Output, toolUseId: string) {
    return {
      tool_use_id: toolUseId,
      type: 'tool_result',
      content: `Task created successfully: ${result.task.subject}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
