/**
 * /pr_comments - Fetch and display GitHub PR comments
 */
import type { Command } from '../types/message.js'
import { execSync } from 'node:child_process'

interface PRComment {
  id: number
  body: string
  user: string
  createdAt: string
  path?: string
  line?: number
  diffHunk?: string
  inReplyTo?: number
}

interface ReviewComment {
  id: number
  body: string
  user: string
  createdAt: string
  path: string
  line: number | null
  diffHunk: string
  inReplyTo?: number
}

/**
 * Check if gh CLI is available
 */
function isGhAvailable(): boolean {
  try {
    execSync('gh --version', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/**
 * Get current PR info
 */
function getCurrentPR(): { owner: string; repo: string; number: number } | null {
  try {
    const output = execSync('gh pr view --json number,headRepository,repository', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    const data = JSON.parse(output)
    const repoUrl = data.repository?.htmlUrl || ''
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (match && data.number) {
      return {
        owner: match[1],
        repo: match[2],
        number: data.number,
      }
    }
  } catch {
    // Ignore errors
  }
  return null
}

/**
 * Fetch PR-level comments
 */
function fetchPRComments(owner: string, repo: string, prNumber: number): PRComment[] {
  try {
    const output = execSync(
      `gh api repos/${owner}/${repo}/issues/${prNumber}/comments`,
      { encoding: 'utf-8', stdio: 'pipe' }
    )
    const comments = JSON.parse(output) as Array<{
      id: number
      body: string
      user: { login: string }
      created_at: string
    }>
    return comments.map((c) => ({
      id: c.id,
      body: c.body,
      user: c.user.login,
      createdAt: c.created_at,
    }))
  } catch {
    return []
  }
}

/**
 * Fetch review comments (code-level)
 */
function fetchReviewComments(owner: string, repo: string, prNumber: number): ReviewComment[] {
  try {
    const output = execSync(
      `gh api repos/${owner}/${repo}/pulls/${prNumber}/comments`,
      { encoding: 'utf-8', stdio: 'pipe' }
    )
    const comments = JSON.parse(output) as Array<{
      id: number
      body: string
      user: { login: string }
      created_at: string
      path: string
      line: number | null
      diff_hunk: string
      in_reply_to?: number
    }>
    return comments.map((c) => ({
      id: c.id,
      body: c.body,
      user: c.user.login,
      createdAt: c.created_at,
      path: c.path,
      line: c.line,
      diffHunk: c.diff_hunk,
      inReplyTo: c.in_reply_to,
    }))
  } catch {
    return []
  }
}

/**
 * Format date to readable format
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format and display PR comments
 */
function formatComments(
  prComments: PRComment[],
  reviewComments: ReviewComment[]
): string {
  const lines: string[] = ['## Pull Request Comments\n']

  // PR-level comments
  if (prComments.length > 0) {
    lines.push('### General Comments\n')
    for (const comment of prComments) {
      lines.push(`- **${comment.user}** (${formatDate(comment.createdAt)}):`)
      lines.push(`  ${comment.body.split('\n').join('\n  ')}`)
      lines.push('')
    }
  }

  // Review comments (grouped by file)
  if (reviewComments.length > 0) {
    const byFile = new Map<string, ReviewComment[]>()
    for (const comment of reviewComments) {
      const key = comment.path || 'unknown'
      if (!byFile.has(key)) {
        byFile.set(key, [])
      }
      byFile.get(key)!.push(comment)
    }

    lines.push('### Code Review Comments\n')
    for (const [file, comments] of byFile) {
      lines.push(`\n**${file}**\n`)
      for (const comment of comments) {
        const lineInfo = comment.line ? `:${comment.line}` : ''
        lines.push(`- @**${comment.user}** (${formatDate(comment.createdAt)}):`)
        if (comment.diffHunk) {
          lines.push('  ```diff')
          lines.push(`  ${comment.diffHunk.split('\n').join('\n  ')}`)
          lines.push('  ```')
        }
        lines.push(`  ${comment.body.split('\n').join('\n  ')}`)
        lines.push('')
      }
    }
  }

  if (prComments.length === 0 && reviewComments.length === 0) {
    return '## Pull Request Comments\n\nNo comments found.'
  }

  return lines.join('\n')
}

export const prCommentsCmd: Command = {
  name: 'pr-comments',
  aliases: ['pr_comments', 'pr-comment'],
  description: 'Fetch and display GitHub pull request comments',
  type: 'local',
  async execute(args: string) {
    // Check if gh CLI is available
    if (!isGhAvailable()) {
      return `Error: GitHub CLI (gh) is not installed.

To install gh:
- macOS: brew install gh
- Linux: sudo apt install gh
- Windows: winget install GitHub.cli

Or download from: https://cli.github.com/`
    }

    // Parse arguments - can be PR URL or number
    let prNumber: number | null = null
    let owner: string | null = null
    let repo: string | null = null

    if (args.trim()) {
      // Try to parse PR URL or number
      const urlMatch = args.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
      if (urlMatch) {
        owner = urlMatch[1]
        repo = urlMatch[2]
        prNumber = parseInt(urlMatch[3])
      } else {
        const num = parseInt(args.trim())
        if (!isNaN(num)) {
          prNumber = num
        }
      }
    }

    // If no PR number provided, try to get current PR
    if (!prNumber) {
      const currentPR = getCurrentPR()
      if (currentPR) {
        owner = currentPR.owner
        repo = currentPR.repo
        prNumber = currentPR.number
      }
    }

    if (!prNumber || !owner || !repo) {
      return `Usage: /pr-comments [pr-url | pr-number]

Fetch comments from a GitHub pull request.

Examples:
  /pr-comments              # Fetch comments from current PR
  /pr-comments 123          # Fetch comments from PR #123
  /pr-comments https://github.com/owner/repo/pull/456
  
Note: Must be run from within a git repository with gh authenticated.`
    }

    // Fetch comments
    const prComments = fetchPRComments(owner, repo, prNumber)
    const reviewComments = fetchReviewComments(owner, repo, prNumber)

    const totalComments = prComments.length + reviewComments.length
    const header = `## PR #${prNumber} Comments (${owner}/${repo})\n\nFound ${totalComments} comment(s)\n`

    return header + formatComments(prComments, reviewComments)
  },
}

export default prCommentsCmd
