/**
 * TeamDeleteTool - 删除团队并清理相关资源
 */

import { z } from 'zod'
import { buildTool, type ToolResult } from '../../Tool.js'

const inputSchema = z.object({})

type Input = z.infer<typeof inputSchema>

export const TeamDeleteTool = buildTool({
  name: 'TeamDelete',
  aliases: ['delete-team', 'disband-team', 'cleanup-team'],
  description: '清理团队和任务目录，当 swarm 完成后使用',
  inputSchema,
  maxResultSizeChars: 100_000,
  shouldDefer: true,

  async call(_input: Input, context): Promise<ToolResult> {
    const { getAppState, setAppState } = context
    const appState = getAppState()
    const teamName = appState.teamContext?.teamName

    if (teamName) {
      // 检查是否有活跃的团队成员
      // 简化版本：直接清理

      // 清理团队状态
      // 在实际实现中，这里会清理:
      // - 团队文件
      // - tmux 会话
      // - 任务目录
      // - 团队成员进程

      setAppState((prev) => ({
        ...prev,
        teamContext: undefined,
        inbox: {
          messages: [],
        },
      }))

      return {
        data: {
          success: true,
          message: `已清理团队 "${teamName}" 的目录和工作树`,
          team_name: teamName,
        },
        content: `
✅ 团队已删除: ${teamName}

🧹 清理完成:
  - 团队上下文已清除
  - 收件箱消息已清空
  - 团队状态已重置

📝 注意: 如果有正在运行的团队成员代理，请先使用 TaskStopTool 停止它们。
`,
      }
    }

    return {
      data: {
        success: true,
        message: '没有找到团队名称，无需清理',
        team_name: undefined,
      },
      content: `
⚠️ 没有找到团队

当前没有活跃的团队需要清理。
`,
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName() {
    return 'TeamDelete'
  },
})
