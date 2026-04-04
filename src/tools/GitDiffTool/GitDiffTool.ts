import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  target: z.string().optional().describe('Target branch, commit, or file path (default: working directory)'),
  source: z.string().optional().describe('Source branch or commit (default: HEAD)'),
  staged: z.boolean().optional().describe('Show staged changes instead of working directory (default: false)'),
  contextLines: z.number().optional().describe('Number of context lines (default: 3)'),
  outputPath: z.string().optional().describe('Save diff to a file path'),
})

type Input = z.infer<typeof inputSchema>

async function getGitDiff(args: string[]): Promise<string> {
  const { spawn } = await import('node:child_process')

  return new Promise((resolve, reject) => {
    const git = spawn('git', args, {
      cwd: getCwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    git.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    git.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    git.on('close', (code) => {
      if (code === 0 || stdout.length > 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr || 'git diff failed'))
      }
    })
  })
}

export const GitDiffTool = buildTool({
  name: 'GitDiff',
  aliases: ['diff', 'git-diff'],
  description:
    'View Git differences between branches, commits, or working directory. Shows what changes have been made.',
  inputSchema,
  maxResultSizeChars: 200_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      // Build git diff arguments
      const args: string[] = ['diff']

      if (input.staged) {
        args.push('--staged')
      }

      if (input.contextLines !== undefined) {
        args.push(`-U${input.contextLines}`)
      }

      if (input.source) {
        args.push(input.source)
      }

      if (input.target) {
        args.push(input.target)
      }

      // Get the diff
      const diffOutput = await getGitDiff(args)

      if (!diffOutput.trim()) {
        return {
          data: {
            hasChanges: false,
          },
          content: 'No changes detected.',
        }
      }

      // Count changes
      const additions = (diffOutput.match(/^\+/gm) || []).filter(line => !line.startsWith('+++')).length
      const deletions = (diffOutput.match(/^-/gm) || []).filter(line => !line.startsWith('---')).length
      const files = (diffOutput.match(/^diff --git/gm) || []).length

      // Format output
      let content = ''
      content += `📊 Diff Summary\n${'─'.repeat(40)}\n`
      content += `Files changed: ${files}\n`
      content += `Additions: +${additions}\n`
      content += `Deletions: -${deletions}\n`
      content += `${'─'.repeat(40)}\n\n`
      content += diffOutput

      const data: Record<string, unknown> = {
        hasChanges: true,
        filesChanged: files,
        additions,
        deletions,
        diff: diffOutput,
      }

      // Optionally save to file
      if (input.outputPath) {
        const { writeFile } = await import('node:fs/promises')
        await writeFile(input.outputPath, diffOutput)
        data.savedTo = input.outputPath
        content += `\n\n✓ Diff saved to: ${input.outputPath}`
      }

      return {
        data,
        content,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        data: {
          hasChanges: false,
          error: errorMessage,
        },
        content: `✗ Failed to get git diff: ${errorMessage}`,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `GitDiff(${input?.target ?? 'working dir'}${input?.source ? ` from ${input.source}` : ''})`
  },
})

