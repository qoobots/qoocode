/**
 * SkillTool - 技能执行工具
 * 
 * 通过工具调用执行技能，扩展 AI 能力。
 */

import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'
import {
  getSkillManager,
  type SkillDefinition,
  type SkillResult,
} from '../../services/skills/skillManager.js'

const inputSchema = z.object({
  skill: z.string().describe('技能名称，如 "review", "git-helper", "test-generator"'),
  action: z.string().optional().describe('要执行的技能动作（可选，默认为第一个动作）'),
  args: z.record(z.unknown()).optional().describe('传递给技能动作的参数'),
})

type Input = z.infer<typeof inputSchema>

// SkillTool 输出类型
type SkillToolOutput = {
  success: boolean
  skillName: string
  action?: string
  result?: string
  error?: string
  allowedTools?: string[]
  model?: string
  status?: 'inline' | 'forked'
}

/**
 * 从技能名称获取技能定义
 */
function findSkillByName(skillName: string): SkillDefinition | undefined {
  const manager = getSkillManager()
  const allSkills = manager.getAllSkills()

  // 移除前导斜杠
  const normalizedName = skillName.startsWith('/')
    ? skillName.slice(1)
    : skillName

  // 精确匹配
  let skill = allSkills.find(s => s.definition.id === normalizedName)
  if (skill) return skill.definition

  // 名称匹配
  skill = allSkills.find(s => 
    s.definition.name.toLowerCase() === normalizedName.toLowerCase()
  )
  if (skill) return skill.definition

  // 别名匹配 (skill name -> id conversion)
  const aliases: Record<string, string> = {
    review: 'code-review',
    'code-review': 'code-review',
    'git': 'git-helper',
    'git-helper': 'git-helper',
    test: 'test-generator',
    'test-generator': 'test-generator',
    doc: 'doc-generator',
    'doc-generator': 'doc-generator',
    remember: 'remember',
    verify: 'verify',
    simplify: 'simplify',
    stuck: 'stuck',
    batch: 'batch',
    keybindings: 'keybindings',
  }

  const aliasedId = aliases[normalizedName.toLowerCase()]
  if (aliasedId) {
    skill = allSkills.find(s => s.definition.id === aliasedId)
    if (skill) return skill.definition
  }

  return undefined
}

/**
 * 获取技能列表用于提示
 */
function getAvailableSkillsHint(): string {
  const manager = getSkillManager()
  const skills = manager.getAllSkills()

  if (skills.length === 0) {
    return 'No skills available.'
  }

  return skills
    .map(s => `  - ${s.definition.id}: ${s.definition.description}`)
    .join('\n')
}

export const SkillTool = buildTool({
  name: 'Skill',
  aliases: ['SkillTool', 'ExecuteSkill'],
  description:
    '执行技能以扩展 AI 能力。支持代码审查、Git 操作、测试生成、文档生成等技能。',
  inputSchema,
  maxResultSizeChars: 50_000,

  userFacingName(input?: Partial<Input>) {
    return `Skill(${input?.skill ?? ''})`
  },

  isReadOnly() {
    return false
  },

  async validateInput({ skill }, { getAppState }) {
    if (!skill?.trim()) {
      return {
        result: false,
        message: 'Skill name is required',
        errorCode: 1,
      }
    }

    // 检查技能是否存在
    const foundSkill = findSkillByName(skill.trim())
    if (!foundSkill) {
      return {
        result: false,
        message: `Unknown skill: ${skill}. Available skills:\n${getAvailableSkillsHint()}`,
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
  ): Promise<ToolResult<SkillToolOutput>> {
    const { skill, action, args } = input

    // 移除前导斜杠
    const skillName = skill.startsWith('/') ? skill.slice(1) : skill

    // 查找技能
    const foundSkill = findSkillByName(skillName)
    if (!foundSkill) {
      return {
        data: {
          success: false,
          skillName,
          error: `Skill "${skillName}" not found`,
        },
        content: `Skill not found: ${skillName}`,
      }
    }

    // 获取要执行的动作
    const skillAction = action || foundSkill.actions[0]?.name
    if (!skillAction) {
      return {
        data: {
          success: false,
          skillName,
          error: `Skill "${skillName}" has no actions`,
        },
        content: `Skill "${foundSkill.name}" has no actions defined.`,
      }
    }

    // 检查动作是否存在
    const actionExists = foundSkill.actions.some(a => a.name === skillAction)
    if (!actionExists) {
      return {
        data: {
          success: false,
          skillName,
          action: skillAction,
          error: `Action "${skillAction}" not found in skill "${foundSkill.name}"`,
        },
        content: `Action "${skillAction}" not found. Available actions: ${foundSkill.actions.map(a => a.name).join(', ')}`,
      }
    }

    // 执行技能
    const manager = getSkillManager()
    const skillContext = {
      cwd: context.options?.cwd || process.cwd(),
      messages: context.options?.messages || [],
      tools: {},
      config: {},
    }

    const result = await manager.execute(
      foundSkill.id,
      skillAction,
      args || {},
      skillContext
    )

    if (result.success) {
      return {
        data: {
          success: true,
          skillName: foundSkill.name,
          action: skillAction,
          result: result.output,
          status: 'inline',
        },
        content: result.output || 'Skill executed successfully.',
      }
    } else {
      return {
        data: {
          success: false,
          skillName: foundSkill.name,
          action: skillAction,
          error: result.error,
        },
        content: `Skill execution failed: ${result.error}`,
      }
    }
  },
})

/**
 * 获取所有可用技能
 */
export function getAllSkills(): SkillDefinition[] {
  return getSkillManager().getAllSkills().map(s => s.definition)
}

/**
 * 检查技能是否存在
 */
export function skillExists(skillName: string): boolean {
  return findSkillByName(skillName) !== undefined
}
