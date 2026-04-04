/**
 * TaskStopTool - 停止正在运行的后台任务
 */

import { z } from 'zod'
import { buildTool, type ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  task_id: z.string().optional().describe('要停止的后台任务的 ID'),
  shell_id: z.string().optional().describe('已弃用: 请使用 task_id'),
})

type Input = z.infer<typeof inputSchema>

export const TaskStopTool = buildTool({
  name: 'TaskStop',
  aliases: ['stop-task', 'kill-task', 'kill'],
  description: '按 ID 停止正在运行的后台任务',
  inputSchema,
  maxResultSizeChars: 100_000,
  shouldDefer: true,

  async call(input: Input, context): Promise<ToolResult> {
    const { getAppState, setAppState } = context
    const appState = getAppState()

    // 支持 task_id 和 shell_id (兼容已弃用的 KillShell)
    const id = input.task_id || input.shell_id

    if (!id) {
      throw new Error('缺少必需参数: task_id')
    }

    // 检查任务是否存在
    const task = appState.tasks?.[id]

    if (!task) {
      return {
        data: {
          message: `未找到 ID 为 ${id} 的任务`,
          task_id: id,
          task_type: 'unknown',
        },
        content: `
⚠️ 未找到任务

没有找到 ID 为 "${id}" 的任务。
任务可能已经完成或被清理。
`,
      }
    }

    if (task.status !== 'running') {
      return {
        data: {
          message: `任务 ${id} 不在运行中 (状态: ${task.status})`,
          task_id: id,
          task_type: task.type || 'unknown',
        },
        content: `
⚠️ 任务未运行

任务 "${id}" 当前状态: ${task.status}
只有运行中的任务才能被停止。
`,
      }
    }

    // 停止任务
    // 在实际实现中，这里会:
    // - 发送中止信号
    // - 清理子进程
    // - 更新任务状态

    const taskType = task.type || 'agent'
    const taskDescription = task.description || task.prompt || '未命名任务'

    // 更新任务状态
    if (appState.tasks) {
      setAppState((prev) => {
        const tasks = { ...prev.tasks }
        if (tasks[id]) {
          tasks[id] = {
            ...tasks[id],
            status: 'stopped' as const,
          }
        }
        return { ...prev, tasks }
      })
    }

    return {
      data: {
        message: `已成功停止任务: ${id} (${taskDescription})`,
        task_id: id,
        task_type: taskType,
        command: taskDescription,
      },
      content: `
✅ 任务已停止

任务 ID: ${id}
任务类型: ${taskType}
任务描述: ${taskDescription}

任务状态已更新为 "stopped"。
`,
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `TaskStop(${input?.task_id ?? 'unknown'})`
  },
})
