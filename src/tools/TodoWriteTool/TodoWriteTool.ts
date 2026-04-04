// TodoWriteTool - Manage session task checklist
import { z } from 'zod'
import { buildTool, type ToolDef, type ToolUseContext } from '../../Tool.js'
import { TODO_WRITE_TOOL_NAME } from './constants.js'
import { DESCRIPTION, PROMPT } from './prompt.js'
import type { TodoItem } from '../../state/AppState.js'

// Input schema
const inputSchema = z.object({
  todos: z.array(
    z.object({
      content: z.string().min(1, 'Content cannot be empty'),
      status: z.enum(['pending', 'in_progress', 'completed']),
      activeForm: z.string().min(1, 'Active form cannot be empty'),
    }),
  ),
})
type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  oldTodos: z.array(
    z.object({
      content: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      activeForm: z.string(),
    }),
  ),
  newTodos: z.array(
    z.object({
      content: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      activeForm: z.string(),
    }),
  ),
})
type OutputSchema = z.infer<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const TodoWriteTool = buildTool({
  name: TODO_WRITE_TOOL_NAME,
  searchHint: 'manage the session task checklist',
  maxResultSizeChars: 100_000,
  strict: true,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema
  },
  get outputSchema(): OutputSchema {
    return outputSchema
  },
  userFacingName() {
    return ''
  },
  isEnabled() {
    return true
  },
  async checkPermissions(input) {
    // No permission checks required for todo operations
    return { behavior: 'allow', updatedInput: input }
  },
  renderToolUseMessage() {
    return null
  },
  async call({ todos }: InputSchema, context: ToolUseContext) {
    // Get old todos from app state
    const appState = context.getAppState()
    const oldTodos = (appState.todos || []) as TodoItem[]

    // If all tasks are completed, clear the list
    const allDone = todos.every((t) => t.status === 'completed')
    const newTodos = allDone ? [] : todos

    // Update app state
    context.setAppState((prev) => ({
      ...prev,
      todos: newTodos,
    }))

    return {
      data: {
        oldTodos,
        newTodos: todos,
      },
    }
  },
  mapToolResultToToolResultBlockParam(result: Output, toolUseId: string) {
    const base = `Todos have been modified successfully. Ensure that you continue to use the todo list to track your progress. Please proceed with the current tasks if applicable`
    return {
      tool_use_id: toolUseId,
      type: 'tool_result',
      content: base,
    }
  },
} satisfies ToolDef<InputSchema, Output>)