import { z } from 'zod'
import { spawn } from 'node:child_process'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const inputSchema = z.object({
  action: z.enum(['list', 'create', 'delete', 'switch', 'rename', 'current'])
    .describe('Action to perform on branches'),
  branchName: z.string().optional().describe('Branch name (for create/delete/switch/rename)'),
  newBranchName: z.string().optional().describe('New branch name (for rename)'),
  force: z.boolean().optional().default(false).describe('Force operation (default: false)'),
})

type Input = z.infer<typeof inputSchema>

async function executeGitCommand(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
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
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code || 0 })
    })

    git.on('error', (error) => {
      reject(error)
    })
  })
}

export const GitBranchTool = buildTool({
  name: 'GitBranch',
  aliases: ['branch', 'git-branch', 'br'],
  description:
    'Manage Git branches. List, create, delete, switch, rename branches.',
  inputSchema,
  maxResultSizeChars: 50_000,

  async call(input: Input): Promise<ToolResult> {
    try {
      switch (input.action) {
        case 'list': {
          const { stdout } = await executeGitCommand(['branch', '-a', '--format=%(HEAD)%(refname:short)%(authoremail)%(committerdate:relative)'])

          if (!stdout) {
            return {
              data: { action: 'list', branches: [] },
              content: '⚠️ No branches found in this repository.',
            }
          }

          const lines = stdout.split('\n').filter(Boolean)
          const branches: Array<{ name: string; isCurrent: boolean }> = []

          for (const line of lines) {
            const isCurrent = line.startsWith('*')
            const parts = line.replace(/^\*\s*/, '').split(/\s+/)
            const name = parts[0] || ''

            branches.push({
              name,
              isCurrent,
            })
          }

          const currentBranch = branches.find(b => b.isCurrent)?.name || 'detached HEAD'

          let content = '🌿 Git Branches\n'
          content += `${'─'.repeat(50)}\n`
          content += `\nCurrent branch: ${currentBranch}\n\n`

          if (branches.length > 0) {
            content += 'All branches:\n'
            for (const branch of branches) {
              const icon = branch.isCurrent ? '→ *' : '  '
              content += `${icon} ${branch.name}\n`
            }
          }

          content += `\n${'─'.repeat(50)}\n`
          content += `Total: ${branches.length} branch(es)`

          return {
            data: {
              action: 'list',
              currentBranch,
              branches,
              count: branches.length,
            },
            content,
          }
        }

        case 'current': {
          const { stdout } = await executeGitCommand(['branch', '--show-current'])
          const branchName = stdout || 'detached HEAD'

          return {
            data: {
              action: 'current',
              branch: branchName,
            },
            content: `✓ Current branch: ${branchName}`,
          }
        }

        case 'create': {
          if (!input.branchName) {
            return {
              data: { action: 'create', error: 'Branch name required' },
              content: '✗ Error: Branch name is required for create action.\nUsage: GitBranch(create, branchName)',
            }
          }

          const args = ['branch']
          if (input.force) {
            args.push('-f')
          }
          args.push(input.branchName)

          const { code, stderr } = await executeGitCommand(args)

          if (code !== 0) {
            return {
              data: {
                action: 'create',
                branchName: input.branchName,
                error: stderr || 'Unknown error',
              },
              content: `✗ Failed to create branch "${input.branchName}": ${stderr || 'Unknown error'}`,
            }
          }

          return {
            data: {
              action: 'create',
              branchName: input.branchName,
              success: true,
            },
            content: `✓ Created new branch: ${input.branchName}\n\nTo switch to this branch, use: GitBranch(switch, ${input.branchName})`,
          }
        }

        case 'delete': {
          if (!input.branchName) {
            return {
              data: { action: 'delete', error: 'Branch name required' },
              content: '✗ Error: Branch name is required for delete action.\nUsage: GitBranch(delete, branchName)',
            }
          }

          const args = ['branch']
          if (input.force) {
            args.push('-D')
          } else {
            args.push('-d')
          }
          args.push(input.branchName)

          const { code, stderr } = await executeGitCommand(args)

          if (code !== 0) {
            return {
              data: {
                action: 'delete',
                branchName: input.branchName,
                error: stderr || 'Unknown error',
              },
              content: `✗ Failed to delete branch "${input.branchName}": ${stderr || 'Unknown error'}\n\nTip: Use force=true to force delete unmerged branches.`,
            }
          }

          return {
            data: {
              action: 'delete',
              branchName: input.branchName,
              success: true,
            },
            content: `✓ Deleted branch: ${input.branchName}`,
          }
        }

        case 'switch': {
          if (!input.branchName) {
            return {
              data: { action: 'switch', error: 'Branch name required' },
              content: '✗ Error: Branch name is required for switch action.\nUsage: GitBranch(switch, branchName)',
            }
          }

          const args = ['checkout']
          if (input.force) {
            args.push('-f')
          }
          args.push(input.branchName)

          const { code, stderr } = await executeGitCommand(args)

          if (code !== 0) {
            return {
              data: {
                action: 'switch',
                branchName: input.branchName,
                error: stderr || 'Unknown error',
              },
              content: `✗ Failed to switch to branch "${input.branchName}": ${stderr || 'Unknown error'}`,
            }
          }

          return {
            data: {
              action: 'switch',
              branchName: input.branchName,
              success: true,
            },
            content: `✓ Switched to branch: ${input.branchName}`,
          }
        }

        case 'rename': {
          if (!input.branchName || !input.newBranchName) {
            return {
              data: { action: 'rename', error: 'Branch names required' },
              content: '✗ Error: Both branch name and new branch name are required for rename.\nUsage: GitBranch(rename, oldName, newName)',
            }
          }

          const args = ['branch', '-m', input.branchName, input.newBranchName]
          const { code, stderr } = await executeGitCommand(args)

          if (code !== 0) {
            return {
              data: {
                action: 'rename',
                oldName: input.branchName,
                newName: input.newBranchName,
                error: stderr || 'Unknown error',
              },
              content: `✗ Failed to rename branch "${input.branchName}" to "${input.newBranchName}": ${stderr || 'Unknown error'}`,
            }
          }

          return {
            data: {
              action: 'rename',
              oldName: input.branchName,
              newName: input.newBranchName,
              success: true,
            },
            content: `✓ Renamed branch: ${input.branchName} → ${input.newBranchName}`,
          }
        }

        default:
          return {
            data: { action: input.action, error: 'Unknown action' },
            content: `✗ Error: Unknown action "${input.action}"`,
          }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return {
        data: {
          action: input.action,
          branchName: input.branchName,
          error: errorMessage,
        },
        content: `✗ Git branch operation failed: ${errorMessage}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `GitBranch(${input?.action ?? 'list'}${input?.branchName ? ` ${input.branchName}` : ''})`
  },

  requiresApproval(input?: Input) {
    // Require approval for delete, switch, and rename operations
    if (input?.action && ['delete', 'switch', 'rename'].includes(input.action)) {
      return true
    }
    return false
  },
})

