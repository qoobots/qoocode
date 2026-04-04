import { z } from 'zod'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  maxCount: z.number().optional().describe('Maximum number of commits to show (default: 10)'),
  prettyFormat: z.enum(['oneline', 'short', 'medium', 'full', 'fuller'])
    .optional()
    .default('oneline')
    .describe('Output format (default: oneline)'),
  branch: z.string().optional().describe('Show log for specific branch'),
  author: z.string().optional().describe('Filter by author'),
  since: z.string().optional().describe('Show commits since (e.g., "2 weeks ago")'),
  until: z.string().optional().describe('Show commits until (e.g., "yesterday")'),
  filePath: z.string().optional().describe('Show log for specific file'),
})

type Input = z.infer<typeof inputSchema>

interface CommitInfo {
  hash: string
  author: string
  date: string
  message: string
}

async function getGitLog(args: string[]): Promise<string> {
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
        reject(new Error(stderr || 'git log failed'))
      }
    })
  })
}

function parseLogLines(logText: string, format: string): CommitInfo[] {
  const commits: CommitInfo[] = []

  if (format === 'oneline') {
    const lines = logText.split('\n').filter(Boolean)
    for (const line of lines) {
      const match = line.match(/^([a-f0-9]+)\s+(.+)$/)
      if (match) {
        commits.push({
          hash: match[1],
          author: '',
          date: '',
          message: match[2],
        })
      }
    }
  } else {
    // For other formats, just return raw text
    // In a full implementation, we'd parse the structured output
    return []
  }

  return commits
}

export const GitLogTool = buildTool({
  name: 'GitLog',
  aliases: ['log', 'git-log', 'history'],
  description:
    'View Git commit history. Shows commit messages, authors, dates, and can filter by various criteria.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      // Build git log arguments
      const args: string[] = ['log']

      // Set output format
      if (input.prettyFormat === 'oneline') {
        args.push('--oneline')
      } else if (input.prettyFormat === 'short') {
        args.push('--pretty=format:%h - %an, %ar : %s')
      } else if (input.prettyFormat === 'medium') {
        args.push('--pretty=format:%h%n%nAuthor: %an <%ae>%nDate: %ad%n%n%s%n%n%b')
      } else if (input.prettyFormat === 'full') {
        args.push('--pretty=format:commit %H%nAuthor: %an <%ae>%nDate: %ad%n%n%s%n%n%b')
      } else {
        args.push('--pretty=fuller')
      }

      // Set limit
      if (input.maxCount !== undefined) {
        args.push(`-${input.maxCount}`)
      }

      // Add filters
      if (input.author) {
        args.push(`--author=${input.author}`)
      }

      if (input.since) {
        args.push(`--since=${input.since}`)
      }

      if (input.until) {
        args.push(`--until=${input.until}`)
      }

      if (input.filePath) {
        args.push('--', input.filePath)
      }

      if (input.branch) {
        args.push(input.branch)
      }

      // Get log
      const logOutput = await getGitLog(args)

      if (!logOutput.trim()) {
        return {
          data: {
            commits: [],
          },
          content: 'No commits found.',
        }
      }

      // Parse commits for structured data
      const commits = parseLogLines(logOutput, input.prettyFormat)

      // Format output
      let content = ''
      content += `📜 Git Log\n${'─'.repeat(40)}\n`

      if (input.branch) {
        content += `Branch: ${input.branch}\n`
      }
      if (input.author) {
        content += `Author: ${input.author}\n`
      }
      if (commits.length > 0) {
        content += `Showing ${commits.length} commit(s)\n`
      }
      content += `${'─'.repeat(40)}\n\n`
      content += logOutput

      return {
        data: {
          commits,
          format: input.prettyFormat,
          rawLog: logOutput,
        },
        content,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        data: {
          commits: [],
          error: errorMessage,
        },
        content: `✗ Failed to get git log: ${errorMessage}`,
      }
    }
  },

  isReadOnly() {
    return true
  },

  userFacingName(input?: Partial<Input>) {
    return `GitLog(${input?.maxCount ?? 10} commits${input?.branch ? ` on ${input.branch}` : ''})`
  },
})

