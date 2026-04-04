import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  reason: z.string().optional().describe('Optional reason for exiting plan mode'),
  saveChanges: z.boolean().optional().default(true).describe('Save changes before exiting (default: true)'),
})

type Input = z.infer<typeof inputSchema>

export const ExitPlanModeTool = buildTool({
  name: 'ExitPlanMode',
  aliases: ['exit-plan', 'leave-plan', 'quit-plan'],
  description:
    'Exit plan mode and return to normal conversation. Optionally provide a reason for exiting.',
  inputSchema,

  async call(input: Input): Promise<ToolResult> {
    // This tool signals the system to exit plan mode
    // The actual mode switching is handled by the REPL component

    let content = '🚪 Exiting Plan Mode\n'

    if (input.reason) {
      content += `\nReason: ${input.reason}\n`
    }

    content += `\n${'─'.repeat(40)}\n`

    if (input.saveChanges) {
      content += '✓ Plan and changes will be saved.\n'
    } else {
      content += '⚠️ Changes will not be saved.\n'
    }

    content += `\nReturning to normal conversation mode...`

    return {
      data: {
        action: 'exit_plan',
        reason: input.reason,
        saveChanges: input.saveChanges,
        timestamp: new Date().toISOString(),
      },
      content,
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `ExitPlanMode(${input?.reason ? `reason: ${input.reason}` : ''})`
  },
})

