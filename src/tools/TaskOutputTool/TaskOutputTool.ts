/**
 * TaskOutputTool - 获取后台任务输出
 * 
 * 用于获取正在运行或已完成的后台任务（shell 命令、代理会话、远程会话）的输出。
 */

import { sleep } from '../../utils/sleep.js'
import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

// 任务状态类型
export type TaskType = 'local_bash' | 'local_agent' | 'remote_agent' | 'other'

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped'

// 统一的任务输出类型
export interface TaskOutput {
  task_id: string
  task_type: TaskType
  status: TaskStatus
  description: string
  output: string
  exitCode?: number | null
  error?: string
  // 代理任务特有字段
  prompt?: string
  result?: string
  // 元数据
  createdAt?: Date
  endedAt?: Date
}

// 任务存储接口
interface TaskStore {
  tasks: Map<string, TaskState>
}

// 任务状态
interface TaskState {
  id: string
  type: TaskType
  status: TaskStatus
  description: string
  output: string
  exitCode?: number | null
  error?: string
  prompt?: string
  result?: string
  createdAt: Date
  endedAt?: Date
}

// 全局任务存储
const taskStore: TaskStore = {
  tasks: new Map(),
}

// Agent 任务存储引用（从 AgentTool 导入）
let activeAgents: Map<string, AgentSession> | null = null

interface AgentSession {
  id: string
  type: string
  prompt: string
  maxRounds: number
  createdAt: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
}

// 尝试从 AgentTool 获取活跃代理
function getActiveAgents(): Map<string, AgentSession> {
  if (!activeAgents) {
    try {
      // 动态导入避免循环依赖
      const agentTool = require('../AgentTool/AgentTool.js')
      activeAgents = new Map(
        (agentTool.getActiveAgents() || []).map((a: AgentSession) => [a.id, a])
      )
    } catch {
      // AgentTool 未加载，使用空 Map
      activeAgents = new Map()
    }
  }
  return activeAgents
}

const inputSchema = z.object({
  task_id: z.string().describe('要获取输出的任务 ID'),
  block: z.boolean().optional().default(true).describe('是否等待任务完成'),
  timeout: z
    .number()
    .min(0)
    .max(600000)
    .optional()
    .default(30000)
    .describe('最大等待时间（毫秒）'),
})

type Input = z.infer<typeof inputSchema>

// 工具输出类型
type TaskOutputToolOutput = {
  retrieval_status: 'success' | 'timeout' | 'not_ready'
  task: TaskOutput | null
}

/**
 * 从任务状态获取输出数据
 */
async function getTaskOutputData(task: TaskState): Promise<TaskOutput> {
  return {
    task_id: task.id,
    task_type: task.type,
    status: task.status,
    description: task.description,
    output: task.output,
    exitCode: task.exitCode,
    error: task.error,
    prompt: task.prompt,
    result: task.result,
    createdAt: task.createdAt,
    endedAt: task.endedAt,
  }
}

/**
 * 等待任务完成
 */
async function waitForTaskCompletion(
  taskId: string,
  getTask: () => TaskState | null,
  timeoutMs: number,
  abortSignal?: AbortSignal
): Promise<TaskState | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    // 检查中止信号
    if (abortSignal?.aborted) {
      throw new Error('Task wait aborted')
    }

    const task = getTask()
    if (!task) {
      return null
    }

    // 任务已完成
    if (task.status !== 'running' && task.status !== 'pending') {
      return task
    }

    // 等待后再轮询
    await sleep(100)
  }

  // 超时 - 返回当前状态
  return getTask()
}

/**
 * 注册一个后台任务
 */
export function registerTask(task: Omit<TaskState, 'createdAt'>): string {
  const fullTask: TaskState = {
    ...task,
    createdAt: new Date(),
  }
  taskStore.tasks.set(task.id, fullTask)
  return task.id
}

/**
 * 更新任务状态
 */
export function updateTask(
  taskId: string,
  updates: Partial<TaskState>
): boolean {
  const task = taskStore.tasks.get(taskId)
  if (!task) {
    return false
  }
  taskStore.tasks.set(taskId, { ...task, ...updates })
  return true
}

/**
 * 获取任务
 */
export function getTask(taskId: string): TaskState | null {
  // 首先检查任务存储
  const storedTask = taskStore.tasks.get(taskId)
  if (storedTask) {
    return storedTask
  }

  // 检查 AgentTool 中的代理
  const agents = getActiveAgents()
  const agent = agents.get(taskId)
  if (agent) {
    return {
      id: agent.id,
      type: 'local_agent',
      status: agent.status as TaskStatus,
      description: `Agent: ${agent.type}`,
      output: agent.result || '',
      prompt: agent.prompt,
      result: agent.result,
      createdAt: agent.createdAt,
      endedAt: agent.status !== 'running' && agent.status !== 'pending' ? new Date() : undefined,
    }
  }

  return null
}

/**
 * 获取所有任务
 */
export function getAllTasks(): TaskState[] {
  const tasks: TaskState[] = []

  // 从任务存储获取
  for (const task of taskStore.tasks.values()) {
    tasks.push(task)
  }

  // 从 AgentTool 获取
  const agents = getActiveAgents()
  for (const agent of agents.values()) {
    // 避免重复（Agent ID 可能与 task ID 冲突）
    if (!taskStore.tasks.has(agent.id)) {
      tasks.push({
        id: agent.id,
        type: 'local_agent',
        status: agent.status as TaskStatus,
        description: `Agent: ${agent.type}`,
        output: agent.result || '',
        prompt: agent.prompt,
        result: agent.result,
        createdAt: agent.createdAt,
        endedAt: agent.status !== 'running' && agent.status !== 'pending' ? new Date() : undefined,
      })
    }
  }

  return tasks
}

export const TaskOutputTool = buildTool({
  name: 'TaskOutput',
  aliases: ['AgentOutput', 'BashOutput'],
  description:
    '获取后台任务（shell 命令、代理会话）的输出。支持阻塞等待任务完成或非阻塞检查状态。',
  inputSchema,
  maxResultSizeChars: 100_000,
  shouldDefer: true,

  userFacingName() {
    return 'Task Output'
  },

  isReadOnly() {
    return true
  },

  async validateInput({ task_id }, { getAppState }) {
    if (!task_id) {
      return {
        result: false,
        message: 'Task ID is required',
        errorCode: 1,
      }
    }

    // 检查任务是否存在
    const task = getTask(task_id)
    if (!task) {
      return {
        result: false,
        message: `No task found with ID: ${task_id}`,
        errorCode: 2,
      }
    }

    return { result: true }
  },

  async call(
    input: Input,
    context,
    _canUseTool,
    _parentMessage,
    _onProgress?
  ): Promise<ToolResult<TaskOutputToolOutput>> {
    const { task_id, block, timeout } = input

    const task = getTask(task_id)
    if (!task) {
      return {
        data: {
          retrieval_status: 'success' as const,
          task: null,
        },
        content: `No task found with ID: ${task_id}`,
      }
    }

    // 非阻塞模式
    if (!block) {
      if (task.status !== 'running' && task.status !== 'pending') {
        // 标记为已通知
        updateTask(task_id, {})
        return {
          data: {
            retrieval_status: 'success' as const,
            task: await getTaskOutputData(task),
          },
          content: formatTaskOutput(task),
        }
      }
      return {
        data: {
          retrieval_status: 'not_ready' as const,
          task: await getTaskOutputData(task),
        },
        content: formatTaskOutput(task),
      }
    }

    // 阻塞模式：等待完成
    const completedTask = await waitForTaskCompletion(
      task_id,
      () => getTask(task_id),
      timeout ?? 30000,
      context.abortController?.signal
    )

    if (!completedTask) {
      return {
        data: {
          retrieval_status: 'timeout' as const,
          task: null,
        },
        content: `Timeout waiting for task ${task_id}`,
      }
    }

    if (completedTask.status === 'running' || completedTask.status === 'pending') {
      return {
        data: {
          retrieval_status: 'timeout' as const,
          task: await getTaskOutputData(completedTask),
        },
        content: formatTaskOutput(completedTask),
      }
    }

    // 任务已完成
    return {
      data: {
        retrieval_status: 'success' as const,
        task: await getTaskOutputData(completedTask),
      },
      content: formatTaskOutput(completedTask),
    }
  },
})

/**
 * 格式化任务输出为可读字符串
 */
function formatTaskOutput(task: TaskState): string {
  const lines: string[] = []

  lines.push(`<task_id>${task.id}</task_id>`)
  lines.push(`<task_type>${task.type}</task_type>`)
  lines.push(`<status>${task.status}</status>`)

  if (task.exitCode !== undefined && task.exitCode !== null) {
    lines.push(`<exit_code>${task.exitCode}</exit_code>`)
  }

  if (task.output?.trim()) {
    lines.push(`<output>\n${task.output.trimEnd()}\n</output>`)
  }

  if (task.error) {
    lines.push(`<error>${task.error}</error>`)
  }

  return lines.join('\n\n')
}

/**
 * 生成任务 ID
 */
export function generateTaskId(prefix: string = 'task'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
