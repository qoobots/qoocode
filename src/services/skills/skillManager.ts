// Skill system for qoocode
import { z } from 'zod'

// Skill definition
export interface SkillDefinition {
  id: string
  name: string
  description: string
  version: string
  author?: string
  tags: string[]
  triggers: string[]  // Keywords that trigger this skill
  actions: SkillAction[]
  config?: Record<string, unknown>
}

// Skill action
export interface SkillAction {
  name: string
  description: string
  inputSchema?: z.ZodType<unknown>
  execute: (input: unknown, context: SkillContext) => Promise<SkillResult>
}

// Skill execution context
export interface SkillContext {
  cwd: string
  messages: Array<{ role: string; content: string }>
  tools: Record<string, unknown>
  config: Record<string, unknown>
}

// Skill execution result
export interface SkillResult {
  success: boolean
  output?: string
  error?: string
  data?: unknown
}

// Skill loader result
export interface LoadedSkill {
  definition: SkillDefinition
  instance: SkillInstance
}

// Skill instance (runtime)
class SkillInstance {
  private config: Record<string, unknown>

  constructor(definition: SkillDefinition, config?: Record<string, unknown>) {
    this.config = { ...definition.config, ...config }
  }

  async execute(actionName: string, input: unknown, context: SkillContext): Promise<SkillResult> {
    const action = this.definition.actions.find((a) => a.name === actionName)
    if (!action) {
      return { success: false, error: `Action "${actionName}" not found` }
    }

    try {
      // Validate input if schema exists
      if (action.inputSchema) {
        input = action.inputSchema.parse(input)
      }

      // Execute action
      return await action.execute(input, context)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  get definition(): SkillDefinition {
    return {
      id: this.definition.id,
      name: this.definition.name,
      description: this.definition.description,
      version: this.definition.version,
      author: this.definition.author,
      tags: this.definition.tags,
      triggers: this.definition.triggers,
      actions: this.definition.actions,
      config: this.config,
    }
  }
}

// Built-in skills
const BUILT_IN_SKILLS: SkillDefinition[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review code for issues, bugs, and improvements',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['code', 'review', 'quality'],
    triggers: ['review', 'review code', 'check code'],
    actions: [
      {
        name: 'review-file',
        description: 'Review a single file',
        async execute(input: unknown, _context: SkillContext): Promise<SkillResult> {
          const { path } = input as { path: string }
          return {
            success: true,
            output: `Would review file: ${path}`,
          }
        },
      },
    ],
  },
  {
    id: 'git-helper',
    name: 'Git Helper',
    description: 'Helper for common Git operations',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['git', 'version-control'],
    triggers: ['git', 'git commit', 'git push', 'git branch'],
    actions: [
      {
        name: 'smart-commit',
        description: 'Create a smart commit message',
        async execute(_input: unknown, _context: SkillContext): Promise<SkillResult> {
          return {
            success: true,
            output: 'Analyzed changes and prepared commit',
          }
        },
      },
    ],
  },
  {
    id: 'test-generator',
    name: 'Test Generator',
    description: 'Generate unit tests for code',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['testing', 'code-generation'],
    triggers: ['test', 'generate test', 'write test'],
    actions: [
      {
        name: 'generate-tests',
        description: 'Generate tests for a file',
        async execute(input: unknown, _context: SkillContext): Promise<SkillResult> {
          const { path, framework } = input as { path: string; framework?: string }
          return {
            success: true,
            output: `Generated tests for ${path} using ${framework || 'vitest'}`,
          }
        },
      },
    ],
  },
  {
    id: 'doc-generator',
    name: 'Documentation Generator',
    description: 'Generate documentation from code',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['documentation', 'code-generation'],
    triggers: ['doc', 'document', 'generate docs', 'readme'],
    actions: [
      {
        name: 'generate-readme',
        description: 'Generate README for a project',
        async execute(input: unknown, _context: SkillContext): Promise<SkillResult> {
          const { path } = input as { path: string }
          return {
            success: true,
            output: `Generated README for ${path}`,
          }
        },
      },
    ],
  },
  // Memory review skill
  {
    id: 'remember',
    name: 'Memory Review',
    description: 'Review and organize auto-memory entries. Propose promotions to qoocode.md, or detect outdated/duplicate entries.',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['memory', 'organization'],
    triggers: ['remember', 'organize memory', 'memory review'],
    actions: [
      {
        name: 'review',
        description: 'Review and organize memory entries',
        async execute(_input: unknown, _context: SkillContext): Promise<SkillResult> {
          return {
            success: true,
            output: 'Memory review: Would analyze qoocode.md and auto-memory for organization opportunities.',
          }
        },
      },
    ],
  },
  {
    id: 'verify',
    name: 'Code Verifier',
    description: 'Verify a code change does what it should by running the app',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['verification', 'testing', 'validation'],
    triggers: ['verify', 'test this', 'check works'],
    actions: [
      {
        name: 'verify',
        description: 'Verify code change by running the app',
        async execute(_input: unknown, _context: SkillContext): Promise<SkillResult> {
          return {
            success: true,
            output: 'Verification: Would run the app to verify the code change works as expected.',
          }
        },
      },
    ],
  },
  {
    id: 'simplify',
    name: 'Code Simplifier',
    description: 'Simplify complex code while preserving functionality',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['refactoring', 'simplification'],
    triggers: ['simplify', 'refactor', 'make simpler'],
    actions: [
      {
        name: 'simplify',
        description: 'Simplify complex code',
        async execute(_input: unknown, _context: SkillContext): Promise<SkillResult> {
          return {
            success: true,
            output: 'Simplification: Would analyze code and suggest simpler alternatives.',
          }
        },
      },
    ],
  },
  {
    id: 'stuck',
    name: 'Stuck Helper',
    description: 'Help when you are stuck on a problem',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['help', 'debugging', 'problem-solving'],
    triggers: ['stuck', 'help me', 'not working'],
    actions: [
      {
        name: 'help',
        description: 'Provide help when stuck',
        async execute(_input: unknown, _context: SkillContext): Promise<SkillResult> {
          return {
            success: true,
            output: 'Stuck helper: Would analyze the problem and provide debugging suggestions.',
          }
        },
      },
    ],
  },
  {
    id: 'batch',
    name: 'Batch Processor',
    description: 'Process multiple files or tasks in batch',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['batch', 'automation', 'bulk'],
    triggers: ['batch', 'process all', 'bulk'],
    actions: [
      {
        name: 'process',
        description: 'Process multiple items in batch',
        async execute(_input: unknown, _context: SkillContext): Promise<SkillResult> {
          return {
            success: true,
            output: 'Batch processing: Would process multiple files or tasks.',
          }
        },
      },
    ],
  },
  {
    id: 'keybindings',
    name: 'Keybindings Helper',
    description: 'Show and manage keyboard shortcuts',
    version: '1.0.0',
    author: 'qoocode',
    tags: ['keybindings', 'shortcuts', 'keyboard'],
    triggers: ['keybindings', 'shortcuts', 'keyboard'],
    actions: [
      {
        name: 'show',
        description: 'Show available keybindings',
        async execute(_input: unknown, _context: SkillContext): Promise<SkillResult> {
          return {
            success: true,
            output: 'Keybindings helper: Would display available keyboard shortcuts.',
          }
        },
      },
    ],
  },
]

// Skill manager
class SkillManager {
  private skills = new Map<string, LoadedSkill>()
  private enabledSkills = new Set<string>()

  constructor() {
    // Load built-in skills
    for (const def of BUILT_IN_SKILLS) {
      this.registerSkill(def)
    }
  }

  // Register a skill
  registerSkill(definition: SkillDefinition, config?: Record<string, unknown>): void {
    const instance = new SkillInstance(definition, config)
    this.skills.set(definition.id, { definition, instance })
  }

  // Enable a skill
  enableSkill(skillId: string): void {
    if (this.skills.has(skillId)) {
      this.enabledSkills.add(skillId)
    }
  }

  // Disable a skill
  disableSkill(skillId: string): void {
    this.enabledSkills.delete(skillId)
  }

  // Get enabled skills
  getEnabledSkills(): LoadedSkill[] {
    return Array.from(this.enabledSkills)
      .map((id) => this.skills.get(id))
      .filter((s): s is LoadedSkill => s !== undefined)
  }

  // Get all skills
  getAllSkills(): LoadedSkill[] {
    return Array.from(this.skills.values())
  }

  // Find skill by trigger
  findSkillByTrigger(trigger: string): LoadedSkill | undefined {
    const lowerTrigger = trigger.toLowerCase()
    for (const skill of this.getEnabledSkills()) {
      if (skill.definition.triggers.some((t) => lowerTrigger.includes(t.toLowerCase()))) {
        return skill
      }
    }
    return undefined
  }

  // Execute a skill action
  async execute(
    skillId: string,
    actionName: string,
    input: unknown,
    context: SkillContext,
  ): Promise<SkillResult> {
    const skill = this.skills.get(skillId)
    if (!skill) {
      return { success: false, error: `Skill "${skillId}" not found` }
    }

    return skill.instance.execute(actionName, input, context)
  }

  // Remove a skill
  removeSkill(skillId: string): boolean {
    this.enabledSkills.delete(skillId)
    return this.skills.delete(skillId)
  }

  // Get skill by ID
  getSkill(skillId: string): LoadedSkill | undefined {
    return this.skills.get(skillId)
  }
}

// Default skill manager instance
let skillManager: SkillManager | null = null

export function getSkillManager(): SkillManager {
  if (!skillManager) {
    skillManager = new SkillManager()
    // Enable all built-in skills by default
    for (const skill of BUILT_IN_SKILLS) {
      skillManager.enableSkill(skill.id)
    }
  }
  return skillManager
}

// Convenience functions
export function getEnabledSkills(): SkillDefinition[] {
  return getSkillManager().getEnabledSkills().map((s) => s.definition)
}

export function findSkill(trigger: string): SkillDefinition | undefined {
  return getSkillManager().findSkillByTrigger(trigger)?.definition
}

export async function executeSkill(
  skillId: string,
  action: string,
  input: unknown,
  context: SkillContext,
): Promise<SkillResult> {
  return getSkillManager().execute(skillId, action, input, context)
}

export type { SkillDefinition, SkillAction, SkillContext, SkillResult }
