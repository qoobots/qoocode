// TaskListTool - List all tasks
import { z } from 'zod'
import { buildTool, type ToolDef, type ToolUseContext } from '../../Tool.js'
import { TASK_LIST_TOOL_NAME } from './constants.js'
import { DESCRIPTION, PROMPT } from './prompt.js'
import type { TodoItem } from '../../state/AppState.js'

// Input schema (empty - no input required)
const inputSchema = z.object({})
type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  tasks: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']),
      owner: z.string().optional(),
      blockedBy: z.array(z.string()),
    }),
  ),
})
type OutputSchema = z.infer<typeof outputSchema>

export type Output = z.infer<OutputSchema>

export const TaskListTool = buildTool({
  name: TASK_LIST_TOOL_NAME,
  searchHint: 'list all tasks',
  maxResultSizeChars: 100_000,
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
    return 'TaskList'
  },
  isEnabled() {
    return true
  },
  async checkPermissions() {
    return { behavior: 'allow', updatedInput: {} }
  },
  async call(_input: InputSchema, context: ToolUseContext) {
    const appState = context.getAppState()
    const todos = (appState.todos || []) as TodoItem[]

    // Convert TodoItem to Task format
    const tasks = todos.map((todo, index) => ({
      id: `task-${index}`,
      subject: todo.content,
      status: todo.status,
      owner: undefined as string | undefined,
      blockedBy: [] as string[],
    }))

    return { data: { tasks } }
  },
  mapToolResultToToolResultBlockParam(result: Output, toolUseId: string) {
    const taskCount = result.tasks.length
    const pendingCount = result.tasks.filter((t) => t.status === 'pending').length
    const inProgressCount = result.tasks.filter((t) => t.status === 'in_progress').length
    const completedCount = result.tasks.filter((t) => t.status === 'completed').length

    const summary = `Tasks: ${taskCount} total (${pendingCount} pending, ${inProgressCount} in progress, ${completedCount} completed)`
    const taskList = result.tasks
      .map((t) => `- ${t.subject} [${t.status}]`)
      .join('\n')

    return {
      tool_use_id: toolUseId,
      type: 'tool_result',
      content: taskCount > 0 ? `${summary}\n\n${taskList}` : 'No tasks in the list.',
    }
  },
} satisfies ToolDef<InputSchema, Output>)