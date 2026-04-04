/**
 * ExitWorktreeTool - Exit the current Git worktree
 */
import { z } from 'zod'
import { buildTool, type ToolCallContext } from '../../Tool.js'
import { execSync } from 'node:child_process'

// No input required
const inputSchema = z.object({})

type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  message: z.string(),
  previousPath: z.string().optional(),
})

type Output = z.infer<typeof outputSchema>

/**
 * Check if current directory is a worktree
 */
function getWorktreeInfo(cwd: string): { isWorktree: boolean; mainRepo: string } {
  try {
    const mainRepo = execSync('git worktree list --porcelain', {
      encoding: 'utf-8',
      cwd,
      stdio: 'pipe',
    })
    
    // Check if this directory appears in worktree list
    const lines = mainRepo.split('\n')
    let currentWorktree: string | null = null
    
    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        const path = line.slice(9)
        if (cwd.startsWith(path) || path.startsWith(cwd)) {
          currentWorktree = path
          break
        }
      }
    }
    
    return {
      isWorktree: currentWorktree !== null,
      mainRepo: currentWorktree || '',
    }
  } catch {
    return { isWorktree: false, mainRepo: '' }
  }
}

/**
 * Get the main repository path
 */
function getMainRepoPath(): string {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()
    return root
  } catch {
    return process.cwd()
  }
}

export const ExitWorktreeTool = buildTool({
  name: 'exit_worktree',
  description: 'Exit the current Git worktree and return to the main repository',
  inputSchema,
  outputSchema,
  maxResultSizeChars: 10000,
  
  async checkPermissions() {
    return { behavior: 'allow' }
  },
  
  async call(_input: InputSchema, _context: ToolCallContext): Promise<{ data: Output }> {
    const currentPath = process.cwd()
    const worktreeInfo = getWorktreeInfo(currentPath)
    
    if (!worktreeInfo.isWorktree) {
      return {
        data: {
          message: 'Not currently in a worktree. Use EnterWorktree first.',
        },
      }
    }
    
    const mainRepo = getMainRepoPath()
    const previousPath = currentPath
    
    // Change to main repository
    process.chdir(mainRepo)
    
    return {
      data: {
        message: `Exited worktree and returned to main repository at ${mainRepo}`,
        previousPath,
      },
    }
  },
  
  renderToolUseMessage(): string {
    return 'Exiting worktree...'
  },
  
  renderToolResultMessage(output: { data: Output }): string {
    return output.data.message
  },
})

export default ExitWorktreeTool
