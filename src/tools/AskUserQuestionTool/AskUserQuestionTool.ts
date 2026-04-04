import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  question: z.string().describe('The question to ask the user'),
  options: z.array(z.string()).min(1).describe('List of options for the user to choose from'),
  multiSelect: z.boolean().optional().describe('Allow multiple selections (default: false)'),
  defaultOption: z.number().optional().describe('Default option index (0-based)'),
})

type Input = z.infer<typeof inputSchema>

interface QuestionResult {
  question: string
  selectedOptions: string[]
  multiSelect: boolean
}

export const AskUserQuestionTool = buildTool({
  name: 'AskUserQuestion',
  aliases: ['ask', 'question', 'choice', 'select'],
  description:
    'Ask the user a question with multiple choice options. The user can select one or more options.',
  inputSchema,
  maxResultSizeChars: 5_000,

  async call(input: Input): Promise<ToolResult> {
    const { question, options, multiSelect, defaultOption } = input

    if (options.length === 0) {
      return {
        data: { error: 'At least one option is required' },
        content: 'Error: Please provide at least one option.',
      }
    }

    // Format the question for display
    const optionList = options
      .map((opt, i) => `  ${i + 1}. ${opt}`)
      .join('\n')

    const multiText = multiSelect ? '(select multiple)' : '(select one)'

    const content = `❓ ${question}\n\n${optionList}\n\n${multiText}\n\n` +
      `Please enter the number${multiSelect ? '(s)' : ''} of your choice${defaultOption !== undefined ? ` (default: ${defaultOption + 1})` : ''}.`

    return {
      data: {
        questionId: `q_${Date.now()}`,
        question,
        options,
        multiSelect: multiSelect ?? false,
        pending: true, // Indicates this is awaiting user response
      } as QuestionResult & { pending: boolean },
      content,
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    const q = input?.question ?? ''
    return `AskUserQuestion(${q.slice(0, 30)}...)`
  },
})

/**
 * Parse user's answer to a question
 */
export function parseUserAnswer(
  answer: string,
  options: string[],
  multiSelect: boolean,
): string[] {
  const trimmed = answer.trim()
  const selected: string[] = []

  if (multiSelect) {
    // Handle comma-separated or space-separated numbers
    const parts = trimmed.split(/[,\s]+/).filter(Boolean)
    for (const part of parts) {
      const idx = parseInt(part, 10) - 1
      if (!isNaN(idx) && idx >= 0 && idx < options.length) {
        selected.push(options[idx])
      }
    }
  } else {
    // Single selection
    const idx = parseInt(trimmed, 10) - 1
    if (!isNaN(idx) && idx >= 0 && idx < options.length) {
      selected.push(options[idx])
    }
  }

  return selected
}
