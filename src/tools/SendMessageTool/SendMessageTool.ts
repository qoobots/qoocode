/**
 * SendMessageTool - 向团队成员发送消息
 */

import { z } from 'zod'
import { buildTool, type ToolResult } from '../../Tool.js'
import type { AppState } from '../../state/AppState.js'

const MessageContent = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('shutdown_request'),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal('shutdown_response'),
    request_id: z.string(),
    approve: z.boolean(),
    reason: z.string().optional(),
  }),
  z.object({
    type: z.literal('plan_approval_response'),
    request_id: z.string(),
    approve: z.boolean(),
    feedback: z.string().optional(),
  }),
])

const inputSchema = z.object({
  to: z.string().describe('接收者: 团队成员名称, "*" 表示广播给所有成员'),
  summary: z.string().optional().describe('消息摘要 (5-10 字，用于 UI 预览)'),
  message: z.union([z.string(), MessageContent]).describe('消息内容'),
})

type Input = z.infer<typeof inputSchema>

interface MailboxMessage {
  from: string
  text: string
  summary?: string
  timestamp: string
  color?: string
}

// 内存中的邮箱存储
const mailboxes = new Map<string, MailboxMessage[]>()

export type SendMessageOutput =
  | {
      success: boolean
      message: string
      routing?: {
        sender: string
        senderColor?: string
        target: string
        targetColor?: string
        summary?: string
        content?: string
      }
    }
  | {
      success: boolean
      message: string
      recipients: string[]
      routing?: {
        sender: string
        senderColor?: string
        target: string
        summary?: string
        content?: string
      }
    }
  | {
      success: boolean
      message: string
      request_id: string
      target: string
    }

function writeToMailbox(recipientName: string, message: MailboxMessage): void {
  if (!mailboxes.has(recipientName)) {
    mailboxes.set(recipientName, [])
  }
  mailboxes.get(recipientName)!.push(message)
}

function findTeammateColor(
  teammates: AppState['teamContext'] extends { teammates: infer T } ? T : never,
  name: string
): string | undefined {
  if (!teammates) return undefined
  for (const teammate of Object.values(teammates as Record<string, { color?: string }>)) {
    if ('name' in teammate) {
      return (teammate as { color?: string }).color
    }
  }
  return undefined
}

export const SendMessageTool = buildTool({
  name: 'SendMessage',
  aliases: ['message', 'send', 'tell'],
  description: '向团队成员发送消息 (swarm 协议)',
  inputSchema,
  maxResultSizeChars: 100_000,
  shouldDefer: true,

  async call(input: Input, context): Promise<ToolResult> {
    const { getAppState } = context
    const appState = getAppState()
    const teamName = appState.teamContext?.teamName

    if (!teamName) {
      throw new Error('不在团队上下文中。使用 TeamCreate 创建团队。')
    }

    // 处理广播
    if (input.to === '*' && typeof input.message === 'string') {
      const teammates = appState.teamContext?.teammates || {}
      const recipients: string[] = []
      const messages: string[] = []

      for (const [agentId, teammate] of Object.entries(teammates)) {
        if ('name' in teammate) {
          const name = (teammate as { name: string }).name
          recipients.push(name)
          writeToMailbox(name, {
            from: 'team-lead',
            text: input.message,
            summary: input.summary,
            timestamp: new Date().toISOString(),
            color: '#3498db',
          })
          messages.push(`已发送给 ${name}`)
        }
      }

      return {
        data: {
          success: true,
          message: `消息已广播给 ${recipients.length} 个成员: ${recipients.join(', ')}`,
          recipients,
          routing: {
            sender: 'team-lead',
            senderColor: '#3498db',
            target: '@team',
            summary: input.summary,
            content: input.message,
          },
        } as SendMessageOutput,
        content: `
📢 广播消息已发送

接收者 (${recipients.length}):
${recipients.map((r) => `  - ${r}`).join('\n')}

消息内容:
${input.message}
`,
      }
    }

    // 处理结构化消息
    if (typeof input.message === 'object') {
      const msg = input.message

      if (msg.type === 'shutdown_request') {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        writeToMailbox(input.to, {
          from: 'team-lead',
          text: JSON.stringify({
            type: 'shutdown_request',
            request_id: requestId,
            from: 'team-lead',
            reason: msg.reason,
          }),
          timestamp: new Date().toISOString(),
        })

        return {
          data: {
            success: true,
            message: `关闭请求已发送给 ${input.to}。请求 ID: ${requestId}`,
            request_id: requestId,
            target: input.to,
          },
          content: `
🔴 关闭请求已发送

目标: ${input.to}
请求 ID: ${requestId}
原因: ${msg.reason || '未指定'}
`,
        }
      }

      if (msg.type === 'shutdown_response') {
        writeToMailbox('team-lead', {
          from: input.to,
          text: JSON.stringify({
            type: 'shutdown_response',
            request_id: msg.request_id,
            approve: msg.approve,
            reason: msg.reason,
          }),
          timestamp: new Date().toISOString(),
        })

        return {
          data: {
            success: true,
            message: `关闭响应已发送给 team-lead`,
            request_id: msg.request_id,
          },
          content: `
${msg.approve ? '✅' : '❌'} 关闭响应已发送

${msg.approve ? '已批准关闭请求' : `已拒绝关闭请求，原因: ${msg.reason}`}
`,
        }
      }
    }

    // 处理普通消息
    if (typeof input.message === 'string') {
      writeToMailbox(input.to, {
        from: 'team-lead',
        text: input.message,
        summary: input.summary,
        timestamp: new Date().toISOString(),
        color: '#3498db',
      })

      return {
        data: {
          success: true,
          message: `消息已发送到 ${input.to} 的收件箱`,
          routing: {
            sender: 'team-lead',
            senderColor: '#3498db',
            target: `@${input.to}`,
            targetColor: undefined,
            summary: input.summary,
            content: input.message,
          },
        },
        content: `
✉️ 消息已发送

收件人: @${input.to}
${input.summary ? `摘要: ${input.summary}` : ''}

内容:
${input.message}
`,
      }
    }

    throw new Error('无效的消息格式')
  },

  isReadOnly(input) {
    return typeof input.message === 'string'
  },

  userFacingName(input?: Partial<Input>) {
    return `SendMessage(to: ${input?.to ?? '?'})`
  },
})

/**
 * 获取邮箱消息
 */
export function getMailboxMessages(recipientName: string): MailboxMessage[] {
  return mailboxes.get(recipientName) || []
}

/**
 * 清空邮箱
 */
export function clearMailbox(recipientName: string): void {
  mailboxes.delete(recipientName)
}
