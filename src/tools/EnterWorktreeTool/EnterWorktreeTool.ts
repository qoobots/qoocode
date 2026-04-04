/**
 * EnterWorktreeTool - Create and enter a Git worktree
 */
import { z } from 'zod'
import { buildTool, type ToolCallContext } from '../../Tool.js'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Input schema
const inputSchema = z.object({
  name: z.string().optional().describe('Optional name for the worktree'),
})

type InputSchema = z.infer<typeof inputSchema>

// Output schema
const outputSchema = z.object({
  worktreePath: z.string(),
  worktreeBranch: z.string().optional(),
  message: z.string(),
})

type Output = z.infer<typeof outputSchema>

/**
 * Find the git root directory
 */
function findGitRoot(cwd: string): string | null {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      cwd,
      stdio: 'pipe',
    }).trim()
    return root
  } catch {
    return null
  }
}

/**
 * List existing worktrees
 */
function listWorktrees(cwd: string): Array<{ path: string; branch: string; head: string }> {
  try {
    const output = execSync('git worktree list --porcelain', {
      encoding: 'utf-8',
      cwd,
      stdio: 'pipe',
    })
    
    const worktrees: Array<{ path: string; branch: string; head: string }> = []
    const entries = output.split('\n')
    
    let current: { path: string; branch: string; head: string } | null = null
    
    for (const line of entries) {
      if (line.startsWith('worktree ')) {
        if (current) worktrees.push(current)
        current = { path: line.slice(9), branch: '', head: '' }
      } else if (line.startsWith('branch ') && current) {
        current.branch = line.slice(7)
      } else if (line.startsWith('HEAD ') && current) {
        current.head = line.slice(5)
      }
    }
    
    if (current) worktrees.push(current)
    return worktrees
  } catch {
    return []
  }
}

/**
 * Generate a slug for the worktree name
 */
function generateSlug(name?: string): string {
  if (name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 64)
  }
  
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 6)
  return `wt-${timestamp}-${random}`
}

export const EnterWorktreeTool = buildTool({
  name: 'enter_worktree',
  description: 'Create and enter a Git worktree',
  inputSchema,
  outputSchema,
  maxResultSizeChars: 10000,
  
  async checkPermissions() {
    return { behavior: 'allow' }
  },
  
  async call(input: InputSchema, _context: ToolCallContext): Promise<{ data: Output }> {
    const gitRoot = findGitRoot(process.cwd())
    
    if (!gitRoot) {
      throw new Error('Not in a Git repository')
    }
    
    const slug = generateSlug(input.name)
    const worktreePath = join(gitRoot, '.worktree', slug)
    
    // Check if worktree already exists
    const existingWorktrees = listWorktrees(gitRoot)
    const existing = existingWorktrees.find(w => w.path === worktreePath)
    
    if (existing) {
      // Change to existing worktree
      process.chdir(worktreePath)
      return {
        data: {
          worktreePath,
          worktreeBranch: existing.branch,
          message: `Switched to existing worktree at ${worktreePath} (branch: ${existing.branch})`,
        },
      }
    }
    
    // Create new worktree
    try {
      execSync(`git worktree create "${worktreePath}" -b ${slug}`, {
        cwd: gitRoot,
        stdio: 'pipe',
      })
      
      // Change to the new worktree
      process.chdir(worktreePath)
      
      return {
        data: {
          worktreePath,
          worktreeBranch: slug,
          message: `Created and entered worktree at ${worktreePath} on branch ${slug}`,
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to create worktree: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  },
  
  renderToolUseMessage(input: InputSchema): string {
    return `Creating worktree${input.name ? ` "${input.name}"` : ''}...`
  },
  
  renderToolResultMessage(output: { data: Output }): string {
    return output.data.message
  },
})

export default EnterWorktreeTool
