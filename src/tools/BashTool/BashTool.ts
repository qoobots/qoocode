import { z } from 'zod'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'
import {
  runSecurityChecks,
  formatSecurityResult,
  SECURITY_CHECK_IDS,
} from './bashSecurity.js'

const execAsync = promisify(exec)

const inputSchema = z.object({
  command: z.string().describe('The shell command to execute'),
  timeout: z
    .number()
    .optional()
    .describe('Timeout in milliseconds (default: 30000)'),
  skipSecurityCheck: z
    .boolean()
    .optional()
    .default(false)
    .describe('Skip security checks (use with caution)'),
})

type Input = z.infer<typeof inputSchema>

// Dangerous command patterns that are always blocked
const ALWAYS_BLOCKED_PATTERNS = [
  { pattern: /:\s*\(\)/, message: 'Empty shell evaluation' },
  { pattern: /eval\s+\$\(/, message: 'Eval with command substitution' },
  { pattern: /exec\s+>/, message: 'Redirecting file descriptor to exec' },
  { pattern: /permit\s+local:/, message: 'Sudoers modification attempt' },
  { pattern: /chmod\s+[+-]?[stx]/i, message: 'Suspicious chmod permission change' },
  { pattern: /curl\s+[^\s]+\s*\|\s*sh/i, message: 'Pipe to shell (curl | sh)' },
  { pattern: /wget\s+[^\s]+\s*\|\s*sh/i, message: 'Pipe to shell (wget | sh)' },
  { pattern: /nc\s+-[el]/i, message: 'Netcat with exec/listen mode' },
  { pattern: /rm\s+-rf\s+\/\s*$/i, message: 'Recursive root deletion' },
  { pattern: /mkfs\./i, message: 'Filesystem format command' },
  { pattern: /dd\s+.*of=\/dev\//i, message: 'Direct device write' },
]

// Read-only commands that don't modify the system
const READONLY_COMMANDS = [
  'cat', 'head', 'tail', 'less', 'more', 'grep', 'find', 'ls', 'pwd', 'echo',
  'which', 'whereis', 'type', 'file', 'stat', 'diff', 'cmp', 'wc', 'sort',
  'uniq', 'cut', 'awk', 'sed', 'tr', 'tee', 'xargs', 'mkdir', 'cd', 'dir',
  'ps', 'top', 'htop', 'free', 'df', 'du', 'id', 'whoami', 'hostname', 'uname',
  'date', 'cal', 'uptime', 'env', 'printenv', 'set', 'trap', 'ulimit', 'umask',
  'git', 'gitk', 'gitg', 'git log', 'git show', 'git diff', 'git status', 'git branch',
  'hg', 'svn', 'cvs',
]

/**
 * Check if a command is read-only
 */
function isReadOnlyCommand(command: string): boolean {
  const trimmed = command.trim()
  const baseCommand = trimmed.split(/\s+/)[0]
  
  // Check exact matches
  if (READONLY_COMMANDS.includes(baseCommand)) {
    return true
  }
  
  // Check git commands (most are read-only except push/pull/commit)
  if (baseCommand === 'git') {
    const subcommand = trimmed.split(/\s+/)[1]
    const readonlyGitCommands = ['log', 'show', 'diff', 'status', 'branch', 'tag', 'stash', 'show']
    return readonlyGitCommands.includes(subcommand || '')
  }
  
  return false
}

/**
 * Check for always-blocked patterns
 */
function checkAlwaysBlocked(command: string): { blocked: boolean; reason?: string } {
  for (const { pattern, message } of ALWAYS_BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { blocked: true, reason: message }
    }
  }
  return { blocked: false }
}

/**
 * Sanitize command for display
 */
function sanitizeForDisplay(command: string): string {
  // Truncate long commands and hide sensitive data
  if (command.length > 100) {
    return command.slice(0, 100) + '...'
  }
  return command
}

export const BashTool = buildTool({
  name: 'Bash',
  aliases: ['bash', 'shell', 'run'],
  description:
    'Execute a shell command and return its output. Use for running build commands, installing packages, git operations, and other shell tasks. Includes comprehensive security checks.',
  inputSchema,
  maxResultSizeChars: 100_000,

  async call(input: Input): Promise<ToolResult> {
    const cwd = getCwd()
    const timeout = input.timeout ?? 30_000
    const command = input.command.trim()

    // Skip security check if explicitly requested
    if (!input.skipSecurityCheck) {
      // First check always-blocked patterns
      const blockedCheck = checkAlwaysBlocked(command)
      if (blockedCheck.blocked) {
        return {
          data: { 
            exitCode: 1, 
            output: '',
            error: `Command blocked: ${blockedCheck.reason}`,
            securityCheckFailed: true,
          },
          content: `Security Block: ${blockedCheck.reason}\n\nThe command "${sanitizeForDisplay(command)}" was blocked because it matches a dangerous pattern.\n\nIf you believe this command is safe, you can use skipSecurityCheck: true, but this is not recommended.`,
          isError: true,
        }
      }

      // Run full security checks
      const securityResult = runSecurityChecks(command)
      if (!securityResult.allowed) {
        return {
          data: {
            exitCode: 1,
            output: '',
            error: formatSecurityResult(securityResult),
            securityCheckFailed: true,
            failedChecks: securityResult.failedChecks,
          },
          content: `Security Check Failed\n\n${formatSecurityResult(securityResult)}\n\nCommand: ${sanitizeForDisplay(command)}\n\nFailed checks: ${securityResult.failedChecks.join(', ')}\n\nIf you believe this command is safe, you can use skipSecurityCheck: true, but this is not recommended.`,
          isError: true,
        }
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB
        env: { ...process.env },
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
      })

      const output = [stdout, stderr].filter(Boolean).join('\n')
      return {
        data: { exitCode: 0, output },
        content: output || '(command produced no output)',
      }
    } catch (err: unknown) {
      const error = err as { code?: string; stdout?: string; stderr?: string; message?: string }
      const output = [error.stdout, error.stderr].filter(Boolean).join('\n')
      const message = error.code === 'ETIMEDOUT'
        ? `Command timed out after ${timeout}ms`
        : error.code === 'ENOENT'
        ? `Command not found: ${command.split(' ')[0]}`
        : error.code === 'EACCES'
        ? `Permission denied: ${command.split(' ')[0]}`
        : error.message ?? 'Unknown error'

      return {
        data: { exitCode: 1, output, error: message },
        content: `${message}\n${output}`,
        isError: true,
      }
    }
  },

  isReadOnly(input?: Partial<Input>) {
    const command = input?.command ?? ''
    return isReadOnlyCommand(command)
  },

  userFacingName(input?: Partial<Input>) {
    const cmd = input?.command ?? ''
    const display = cmd.length > 60 ? cmd.slice(0, 60) + '...' : cmd
    return `Bash(${display})`
  },
})

// Export security check IDs for external use
export { SECURITY_CHECK_IDS }
