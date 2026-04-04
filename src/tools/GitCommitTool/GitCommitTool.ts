import { z } from 'zod'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const execAsync = promisify(exec)

const inputSchema = z.object({
  action: z.enum(['status', 'diff', 'add', 'commit', 'log', 'branch', 'push', 'pull'])
    .describe('Git action to perform'),
  message: z.string().optional().describe('Commit message'),
  files: z.string().optional().describe('Files to stage (comma-separated, or "all" for all)'),
  options: z.string().optional().describe('Additional git options'),
})

type Input = z.infer<typeof inputSchema>

interface GitResult {
  stdout: string
  stderr: string
  exitCode: number
}

async function runGit(args: string, cwd?: string): Promise<GitResult> {
  const workDir = cwd ?? getCwd()
  try {
    const { stdout, stderr } = await execAsync(`git ${args}`, {
      cwd: workDir,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })
    return { stdout, stderr, exitCode: 0 }
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; code?: number }
    return {
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      exitCode: err.code ?? 1,
    }
  }
}

function parseStatus(statusOutput: string): {
  branch: string
  staged: string[]
  modified: string[]
  untracked: string[]
} {
  const lines = statusOutput.trim().split('\n')
  const branch = lines[0]?.replace('On branch ', '') || 'unknown'
  const staged: string[] = []
  const modified: string[] = []
  const untracked: string[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim()
    if (!line) continue

    // Parse status like "M  modified.ts" or "?? untracked.ts"
    const match = line.match(/^([MADRC?])\s+(.+)$/)
    if (match) {
      const [, status, file] = match
      if (status === '?' || status === '??') {
        untracked.push(file)
      } else {
        staged.push(file)
      }
    }

    // Also check for "modified:" section
    const modifiedMatch = line.match(/^modified:\s+(.+)$/)
    if (modifiedMatch) {
      modified.push(modifiedMatch[1])
    }
  }

  return { branch, staged, modified, untracked }
}

export const GitCommitTool = buildTool({
  name: 'GitCommit',
  aliases: ['git', 'git-commit'],
  description:
    'Execute Git commands. Supports status, diff, add, commit, log, branch, push, pull operations.',
  inputSchema,
  maxResultSizeChars: 50_000,

  async call(input: Input): Promise<ToolResult> {
    const { action, message, files, options } = input

    switch (action) {
      case 'status': {
        const result = await runGit('status --short')
        if (result.exitCode !== 0) {
          return {
            data: { action, error: result.stderr || 'Git not initialized' },
            content: `Error: ${result.stderr || 'Not a git repository'}`,
          }
        }

        const parsed = parseStatus(result.stdout)
        let content = `📊 Git Status\n\nBranch: ${parsed.branch}\n`

        if (parsed.staged.length > 0) {
          content += `\nStaged files (${parsed.staged.length}):\n${parsed.staged.map((f) => `  ✓ ${f}`).join('\n')}`
        }
        if (parsed.modified.length > 0) {
          content += `\nModified files (${parsed.modified.length}):\n${parsed.modified.map((f) => `  ✎ ${f}`).join('\n')}`
        }
        if (parsed.untracked.length > 0) {
          content += `\nUntracked files (${parsed.untracked.length}):\n${parsed.untracked.map((f) => `  ? ${f}`).join('\n')}`
        }

        if (parsed.staged.length === 0 && parsed.modified.length === 0 && parsed.untracked.length === 0) {
          content += '\n\nNo changes to commit.'
        }

        return { data: { action, ...parsed }, content }
      }

      case 'diff': {
        const diffArgs = files ? `diff ${files}` : 'diff --staged'
        const result = await runGit(diffArgs)
        return {
          data: { action, hasChanges: result.stdout.length > 0 },
          content: result.stdout || 'No changes detected.',
        }
      }

      case 'add': {
        const stageTarget = files === 'all' || !files ? '-A' : files
        const result = await runGit(`add ${stageTarget}`)
        if (result.exitCode !== 0) {
          return { data: { action, error: result.stderr }, content: `Error: ${result.stderr}` }
        }
        return {
          data: { action, staged: files || 'all' },
          content: `✅ Staged files: ${files || 'all changes'}`,
        }
      }

      case 'commit': {
        if (!message) {
          return {
            data: { action, error: 'Commit message required' },
            content: 'Error: Please provide a commit message using the "message" parameter.',
          }
        }
        // Auto-stage all changes before commit
        await runGit('add -A')
        const result = await runGit(`commit -m "${message}" ${options || ''}`)
        if (result.exitCode !== 0) {
          return { data: { action, error: result.stderr }, content: `Error: ${result.stderr}` }
        }
        return {
          data: { action, message },
          content: `✅ Commit successful!\n\n${result.stdout}`,
        }
      }

      case 'log': {
        const count = options || '-10'
        const result = await runGit(`log ${count} --oneline`)
        return {
          data: { action },
          content: `📜 Recent Commits:\n\n${result.stdout || 'No commits yet.'}`,
        }
      }

      case 'branch': {
        if (options === '-a' || options === '--all') {
          const result = await runGit('branch -a')
          return { data: { action }, content: `🌿 Branches:\n\n${result.stdout}` }
        }
        const result = await runGit('branch')
        return { data: { action }, content: `🌿 Branches:\n\n${result.stdout}` }
      }

      case 'push': {
        const remote = options || 'origin'
        const result = await runGit(`push ${remote}`)
        if (result.exitCode !== 0) {
          return { data: { action, error: result.stderr }, content: `Error pushing: ${result.stderr}` }
        }
        return { data: { action }, content: `✅ Pushed to ${remote}\n\n${result.stdout}` }
      }

      case 'pull': {
        const remote = options || 'origin'
        const result = await runGit(`pull ${remote}`)
        if (result.exitCode !== 0) {
          return { data: { action, error: result.stderr }, content: `Error pulling: ${result.stderr}` }
        }
        return { data: { action }, content: `✅ Pulled from ${remote}\n\n${result.stdout}` }
      }

      default:
        return { data: { action, error: 'Unknown action' }, content: `Unknown action: ${action}` }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `GitCommit(${input?.action ?? 'status'})`
  },
})
