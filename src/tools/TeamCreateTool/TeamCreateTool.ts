/**
 * TeamCreateTool - 创建团队用于协调多个代理
 */

import { z } from 'zod'
import { buildTool, type ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  team_name: z.string().describe('团队的名称'),
  description: z.string().optional().describe('团队描述/用途'),
  agent_type: z.string().optional().describe('团队负责人的类型/角色 (如 "researcher", "test-runner")'),
})

type Input = z.infer<typeof inputSchema>

interface TeamFile {
  name: string
  description?: string
  createdAt: number
  leadAgentId: string
  leadSessionId: string
  members: TeamMember[]
}

interface TeamMember {
  agentId: string
  name: string
  agentType: string
  model: string
  joinedAt: number
  tmuxPaneId: string
  cwd: string
  subscriptions: string[]
}

// 内存中的团队存储
const teams = new Map<string, TeamFile>()

function generateAgentId(name: string, teamName: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '-')}@${teamName}`
}

function generateWordSlug(): string {
  const adjectives = ['swift', 'bright', 'calm', 'bold', 'keen', 'warm', 'cool', 'wise']
  const nouns = ['fox', 'owl', 'bear', 'wolf', 'hawk', 'deer', 'lion', 'eagle']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}-${noun}-${num}`
}

function generateUniqueTeamName(providedName: string): string {
  if (!teams.has(providedName)) {
    return providedName
  }
  return generateWordSlug()
}

export const TeamCreateTool = buildTool({
  name: 'TeamCreate',
  aliases: ['create-team', 'new-team', 'spawn-team'],
  description: '创建一个新团队用于协调多个代理',
  inputSchema,
  maxResultSizeChars: 100_000,
  shouldDefer: true,

  async call(input: Input, context): Promise<ToolResult> {
    const { getAppState, setAppState } = context
    const appState = getAppState()

    // 检查是否已经在团队中
    const existingTeam = appState.teamContext?.teamName
    if (existingTeam) {
      throw new Error(
        `已经在领导团队 "${existingTeam}"。一个负责人一次只能管理一个团队。使用 TeamDelete 结束当前团队后再创建新团队。`
      )
    }

    // 如果团队已存在，生成唯一名称
    const finalTeamName = generateUniqueTeamName(input.team_name)

    // 生成团队负责人 ID
    const leadAgentId = generateAgentId('team-lead', finalTeamName)
    const leadAgentType = input.agent_type || 'team-lead'

    // 创建团队文件
    const teamFile: TeamFile = {
      name: finalTeamName,
      description: input.description,
      createdAt: Date.now(),
      leadAgentId,
      leadSessionId: `session-${Date.now()}`,
      members: [
        {
          agentId: leadAgentId,
          name: 'team-lead',
          agentType: leadAgentType,
          model: appState.model || 'gpt-4',
          joinedAt: Date.now(),
          tmuxPaneId: '',
          cwd: process.cwd(),
          subscriptions: [],
        },
      ],
    }

    teams.set(finalTeamName, teamFile)

    // 更新 AppState 中的团队上下文
    setAppState((prev) => ({
      ...prev,
      teamContext: {
        teamName: finalTeamName,
        teamFilePath: `.QOOCODE/teams/${finalTeamName}.json`,
        leadAgentId,
        teammates: {
          [leadAgentId]: {
            name: 'team-lead',
            agentType: leadAgentType,
            color: '#3498db',
            tmuxSessionName: '',
            tmuxPaneId: '',
            cwd: process.cwd(),
            spawnedAt: Date.now(),
          },
        },
      },
    }))

    return {
      data: {
        team_name: finalTeamName,
        team_file_path: `.QOOCODE/teams/${finalTeamName}.json`,
        lead_agent_id: leadAgentId,
      },
      content: `
✅ 团队已创建: ${finalTeamName}

📋 团队信息:
  - 团队名称: ${finalTeamName}
  - 负责人 ID: ${leadAgentId}
  - 负责人类型: ${leadAgentType}
  - 创建时间: ${new Date().toISOString()}

🔧 团队功能:
  - 使用 Agent 工具可以生成新的团队成员
  - 使用 SendMessage 工具可以向团队成员发送消息
  - 使用 TeamDelete 工具可以清理团队

💡 提示: 团队创建后，你可以使用 Agent 工具生成多个工作代理来并行完成任务。
`,
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `TeamCreate(${input?.team_name ?? 'new-team'})`
  },
})

/**
 * 获取团队信息
 */
export function getTeam(teamName: string): TeamFile | undefined {
  return teams.get(teamName)
}

/**
 * 获取所有团队
 */
export function getAllTeams(): TeamFile[] {
  return Array.from(teams.values())
}

/**
 * 添加团队成员
 */
export function addTeamMember(teamName: string, member: TeamMember): boolean {
  const team = teams.get(teamName)
  if (team) {
    team.members.push(member)
    return true
  }
  return false
}

/**
 * 移除团队成员
 */
export function removeTeamMember(teamName: string, agentId: string): boolean {
  const team = teams.get(teamName)
  if (team) {
    const index = team.members.findIndex((m) => m.agentId === agentId)
    if (index !== -1) {
      team.members.splice(index, 1)
      return true
    }
  }
  return false
}
