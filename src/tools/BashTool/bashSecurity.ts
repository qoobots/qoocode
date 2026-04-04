/**
 * Bash Security Module
 * 
 * Provides comprehensive security checks for shell command execution.
 * Implements 23 security check types including:
 * - Command substitution detection
 * - Shell metacharacter validation
 * - Zsh dangerous command blocking
 * - Heredoc injection prevention
 * - And more...
 */

export type SecurityCheckResult = {
  allowed: boolean
  reason?: string
  checkId?: number
}

export type SecurityCheckType = 
  | 'INCOMPLETE_COMMANDS'
  | 'JQ_SYSTEM_FUNCTION'
  | 'JQ_FILE_ARGUMENTS'
  | 'OBFUSCATED_FLAGS'
  | 'SHELL_METACHARACTERS'
  | 'DANGEROUS_VARIABLES'
  | 'NEWLINES'
  | 'COMMAND_SUBSTITUTION'
  | 'INPUT_REDIRECTION'
  | 'OUTPUT_REDIRECTION'
  | 'IFS_INJECTION'
  | 'GIT_COMMIT_SUBSTITUTION'
  | 'PROC_ENVIRON_ACCESS'
  | 'MALFORMED_TOKEN_INJECTION'
  | 'BACKSLASH_ESCAPED_WHITESPACE'
  | 'BRACE_EXPANSION'
  | 'CONTROL_CHARACTERS'
  | 'UNICODE_WHITESPACE'
  | 'MID_WORD_HASH'
  | 'ZSH_DANGEROUS_COMMANDS'
  | 'BACKSLASH_ESCAPED_OPERATORS'
  | 'COMMENT_QUOTE_DESYNC'
  | 'QUOTED_NEWLINE'

// Security check IDs mapping
export const SECURITY_CHECK_IDS = {
  INCOMPLETE_COMMANDS: 1,
  JQ_SYSTEM_FUNCTION: 2,
  JQ_FILE_ARGUMENTS: 3,
  OBFUSCATED_FLAGS: 4,
  SHELL_METACHARACTERS: 5,
  DANGEROUS_VARIABLES: 6,
  NEWLINES: 7,
  DANGEROUS_PATTERNS_COMMAND_SUBSTITUTION: 8,
  DANGEROUS_PATTERNS_INPUT_REDIRECTION: 9,
  DANGEROUS_PATTERNS_OUTPUT_REDIRECTION: 10,
  IFS_INJECTION: 11,
  GIT_COMMIT_SUBSTITUTION: 12,
  PROC_ENVIRON_ACCESS: 13,
  MALFORMED_TOKEN_INJECTION: 14,
  BACKSLASH_ESCAPED_WHITESPACE: 15,
  BRACE_EXPANSION: 16,
  CONTROL_CHARACTERS: 17,
  UNICODE_WHITESPACE: 18,
  MID_WORD_HASH: 19,
  ZSH_DANGEROUS_COMMANDS: 20,
  BACKSLASH_ESCAPED_OPERATORS: 21,
  COMMENT_QUOTE_DESYNC: 22,
  QUOTED_NEWLINE: 23,
} as const

// Zsh-specific dangerous commands
const ZSH_DANGEROUS_COMMANDS = new Set([
  'zmodload',     // Gateway to dangerous module-based attacks
  'emulate',      // eval-equivalent with -c flag
  'sysopen',      // Opens files with fine-grained control
  'sysread',      // Reads from file descriptors
  'syswrite',     // Writes to file descriptors
  'sysseek',      // Seeks on file descriptors
  'zpty',         // Executes commands on pseudo-terminals
  'ztcp',         // Creates TCP connections for exfiltration
  'zsocket',      // Creates Unix/TCP sockets
  'mapfile',      // Invisible file I/O via array assignment
  'zf_rm',        // Builtin rm from zsh/files
  'zf_mv',        // Builtin mv from zsh/files
  'zf_ln',        // Builtin ln from zsh/files
  'zf_chmod',     // Builtin chmod from zsh/files
  'zf_chown',     // Builtin chown from zsh/files
  'zf_mkdir',     // Builtin mkdir from zsh/files
  'zf_rmdir',     // Builtin rmdir from zsh/files
  'zf_chgrp',     // Builtin chgrp from zsh/files
])

// Dangerous patterns for command substitution
const COMMAND_SUBSTITUTION_PATTERNS = [
  { pattern: /<\(/, message: 'process substitution <()' },
  { pattern: />\(/, message: 'process substitution >()' },
  { pattern: /=\(/, message: 'Zsh process substitution =()' },
  { pattern: /(?:^|[\s;&|])=[a-zA-Z_]/, message: 'Zsh equals expansion (=cmd)' },
  { pattern: /\$\(/, message: '$() command substitution' },
  { pattern: /\$\{/, message: '${} parameter substitution' },
  { pattern: /\$\[/, message: '$[] legacy arithmetic expansion' },
  { pattern: /~\[/, message: 'Zsh-style parameter expansion' },
  { pattern: /\(e:/, message: 'Zsh-style glob qualifiers' },
  { pattern: /\(\+/, message: 'Zsh glob qualifier with command execution' },
  { pattern: /\}\s*always\s*\{/, message: 'Zsh always block' },
  { pattern: /<#/, message: 'PowerShell comment syntax' },
]

// Heredoc in substitution pattern
const HEREDOC_IN_SUBSTITUTION = /\$\(.*<</

// Dangerous variable patterns
const DANGEROUS_VARIABLE_PATTERNS = [
  { pattern: /\$\{?\!/, message: 'history expansion !' },
  { pattern: /\$\{?\@/, message: 'positional parameter array @' },
  { pattern: /\$\{?\*\}/, message: 'all positional parameters *' },
  { pattern: /\$_/g, message: 'last argument $_' },
]

// Shell metacharacters that need escaping
const SHELL_METACHARACTERS = /[;&\`$|()<>!#*?[\]{}~\\]/

// Control characters that shouldn't appear in commands
const CONTROL_CHARACTERS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/

// Unicode whitespace patterns
const UNICODE_WHITESPACE = /[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/

// Dangerous git commit patterns
const GIT_COMMIT_SUBSTITUTION_PATTERNS = [
  { pattern: /git\s+commit\s+-[am]\s+['"`].*\$\(/, message: 'git commit with command substitution' },
  { pattern: /git\s+commit\s+-[am]\s+['"`].*\$\{/, message: 'git commit with parameter substitution' },
]

// Proc environ access patterns
const PROC_ENVIRON_PATTERNS = [
  { pattern: /\/proc\/[0-9]+\/environ/, message: 'accessing /proc/*/environ' },
  { pattern: /cat\s+\/proc\/[0-9]+\/environ/, message: 'reading process environment' },
]

/**
 * Check if a command contains incomplete/unbalanced syntax
 */
export function checkIncompleteCommands(command: string): SecurityCheckResult {
  const quoteCount = (command.match(/['"]/g) || []).length
  const backtickCount = (command.match(/`/g) || []).length
  
  // Check for unbalanced quotes
  const singleQuotes = (command.match(/'/g) || []).length
  const doubleQuotes = (command.match(/"/g) || []).length
  
  if (singleQuotes % 2 !== 0) {
    return {
      allowed: false,
      reason: 'Unclosed single quote',
      checkId: SECURITY_CHECK_IDS.INCOMPLETE_COMMANDS
    }
  }
  
  if (doubleQuotes % 2 !== 0) {
    return {
      allowed: false,
      reason: 'Unclosed double quote',
      checkId: SECURITY_CHECK_IDS.INCOMPLETE_COMMANDS
    }
  }
  
  // Check for unbalanced parentheses
  let parenDepth = 0
  let inQuote = false
  let escape = false
  
  for (const char of command) {
    if (escape) {
      escape = false
      continue
    }
    if (char === '\\') {
      escape = true
      continue
    }
    if (char === '"' || char === "'") {
      inQuote = !inQuote
      continue
    }
    if (!inQuote) {
      if (char === '(') parenDepth++
      if (char === ')') parenDepth--
      if (parenDepth < 0) {
        return {
          allowed: false,
          reason: 'Unbalanced parentheses',
          checkId: SECURITY_CHECK_IDS.INCOMPLETE_COMMANDS
        }
      }
    }
  }
  
  if (parenDepth !== 0) {
    return {
      allowed: false,
      reason: 'Unclosed parenthesis',
      checkId: SECURITY_CHECK_IDS.INCOMPLETE_COMMANDS
    }
  }
  
  return { allowed: true }
}

/**
 * Check for jq system function access
 */
export function checkJqSystemFunction(command: string): SecurityCheckResult {
  const jqPattern = /jq\s+[^']*'system\(/g
  
  if (jqPattern.test(command)) {
    return {
      allowed: false,
      reason: 'jq system() function is not allowed',
      checkId: SECURITY_CHECK_IDS.JQ_SYSTEM_FUNCTION
    }
  }
  
  return { allowed: true }
}

/**
 * Check for jq file arguments that might read sensitive files
 */
export function checkJqFileArguments(command: string): SecurityCheckResult {
  const dangerousJqArgs = [
    '/etc/passwd',
    '/etc/shadow',
    '/etc/sudoers',
    '/root/.ssh/',
    '/home/*/.ssh/',
  ]
  
  for (const pattern of dangerousJqArgs) {
    if (command.includes(pattern) && command.includes('jq')) {
      return {
        allowed: false,
        reason: `jq accessing sensitive file: ${pattern}`,
        checkId: SECURITY_CHECK_IDS.JQ_FILE_ARGUMENTS
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for obfuscated flags that hide command behavior
 */
export function checkObfuscatedFlags(command: string): SecurityCheckResult {
  // Check for base64 encoded commands
  const base64Pattern = /\|\s*base64\s+-d|\|\s*openssl\s+[a-z]+\s+-d/
  
  if (base64Pattern.test(command)) {
    return {
      allowed: false,
      reason: 'Base64/openssl decoding detected - possible command obfuscation',
      checkId: SECURITY_CHECK_IDS.OBFUSCATED_FLAGS
    }
  }
  
  // Check for hex encoded commands
  const hexPattern = /\|\s*(?:xxd|printf\s+\$[a-z]|perl\s+-e)/
  
  if (hexPattern.test(command)) {
    return {
      allowed: false,
      reason: 'Hex encoding detected - possible command obfuscation',
      checkId: SECURITY_CHECK_IDS.OBFUSCATED_FLAGS
    }
  }
  
  return { allowed: true }
}

/**
 * Check for shell metacharacters that could be dangerous
 */
export function checkShellMetacharacters(command: string): SecurityCheckResult {
  // Allow safe patterns (common usage)
  const safePatterns = [
    /&&/,
    /\|\|/,
    />/,
    /<.*\|/,
    /2>&1/,
    /\$HOME/,
    /\$USER/,
    /\$PATH/,
  ]
  
  for (const pattern of safePatterns) {
    if (pattern.test(command)) {
      return { allowed: true }
    }
  }
  
  // Check for dangerous metacharacter sequences
  const dangerousPatterns = [
    /`[^`]+`/g,           // Backtick command substitution
    /\$\([^)]+\)/g,       // $() command substitution
    /\$\{[^}]+\}/g,       // Parameter expansion
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: 'Dangerous shell metacharacters detected',
        checkId: SECURITY_CHECK_IDS.SHELL_METACHARACTERS
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for dangerous environment variables
 */
export function checkDangerousVariables(command: string): SecurityCheckResult {
  for (const { pattern, message } of DANGEROUS_VARIABLE_PATTERNS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: message,
        checkId: SECURITY_CHECK_IDS.DANGEROUS_VARIABLES
      }
    }
  }
  
  // Check for setting sensitive env vars
  const sensitiveEnvVars = [
    'LD_PRELOAD',
    'LD_LIBRARY_PATH',
    'DYLD_INSERT_LIBRARIES',
    'DYLD_LIBRARY_PATH',
    'BASH_ENV',
    'ENV',
    'CDPATH',
    'GLOBIGNORE',
    'PATH',
  ]
  
  for (const envVar of sensitiveEnvVars) {
    const pattern = new RegExp(`${envVar}=`, 'i')
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: `Setting dangerous environment variable: ${envVar}`,
        checkId: SECURITY_CHECK_IDS.DANGEROUS_VARIABLES
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for embedded newlines that might split commands
 */
export function checkNewlines(command: string): SecurityCheckResult {
  if (command.includes('\n')) {
    return {
      allowed: false,
      reason: 'Embedded newlines in command are not allowed',
      checkId: SECURITY_CHECK_IDS.NEWLINES
    }
  }
  
  return { allowed: true }
}

/**
 * Check for command substitution patterns
 */
export function checkCommandSubstitution(command: string): SecurityCheckResult {
  // Check for heredoc in substitution
  if (HEREDOC_IN_SUBSTITUTION.test(command)) {
    return {
      allowed: false,
      reason: 'Heredoc in command substitution not allowed',
      checkId: SECURITY_CHECK_IDS.DANGEROUS_PATTERNS_COMMAND_SUBSTITUTION
    }
  }
  
  for (const { pattern, message } of COMMAND_SUBSTITUTION_PATTERNS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: `Command substitution detected: ${message}`,
        checkId: SECURITY_CHECK_IDS.DANGEROUS_PATTERNS_COMMAND_SUBSTITUTION
      }
    }
  }
  
  // Check for backtick substitution
  const backtickPattern = /`[^`]*\$\([^)]*\)[^`]*`/
  if (backtickPattern.test(command)) {
    return {
      allowed: false,
      reason: 'Nested backtick command substitution not allowed',
      checkId: SECURITY_CHECK_IDS.DANGEROUS_PATTERNS_COMMAND_SUBSTITUTION
    }
  }
  
  return { allowed: true }
}

/**
 * Check for dangerous input redirection
 */
export function checkInputRedirection(command: string): SecurityCheckResult {
  // Dangerous input redirection patterns
  const dangerousPatterns = [
    { pattern: /<\s*\/etc\//, message: 'Reading from /etc/' },
    { pattern: /<\s*\/proc\//, message: 'Reading from /proc/' },
    { pattern: /<\s*\/sys\//, message: 'Reading from /sys/' },
    { pattern: /<\s*~\//, message: 'Reading from home directory' },
    { pattern: /<\s*\/root\//, message: 'Reading from /root/' },
  ]
  
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: `Dangerous input redirection: ${message}`,
        checkId: SECURITY_CHECK_IDS.DANGEROUS_PATTERNS_INPUT_REDIRECTION
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for dangerous output redirection
 */
export function checkOutputRedirection(command: string): SecurityCheckResult {
  // Dangerous output redirection patterns
  const dangerousPatterns = [
    { pattern: />\s*\/etc\//, message: 'Writing to /etc/' },
    { pattern: />\s*\/bin\//, message: 'Writing to /bin/' },
    { pattern: />\s*\/usr\/bin\//, message: 'Writing to /usr/bin/' },
    { pattern: />\s*\/sbin\//, message: 'Writing to /sbin/' },
    { pattern: />\s*\/usr\/sbin\//, message: 'Writing to /usr/sbin/' },
    { pattern: />\s*\/lib\//, message: 'Writing to /lib/' },
    { pattern: />\s*\/sys\//, message: 'Writing to /sys/' },
    { pattern: />\s*\/proc\//, message: 'Writing to /proc/' },
    { pattern: />\s*~\//, message: 'Writing to home directory' },
    { pattern: />\s*\/root\//, message: 'Writing to /root/' },
    { pattern: />\s*\/dev\/null/, message: 'Silencing output to /dev/null (may hide errors)' },
    { pattern: /2>\s*\/dev\/null/, message: 'Silencing errors to /dev/null' },
    { pattern: /&\s*>\s*\/dev\/null/, message: 'Silencing all output to /dev/null' },
  ]
  
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: `Dangerous output redirection: ${message}`,
        checkId: SECURITY_CHECK_IDS.DANGEROUS_PATTERNS_OUTPUT_REDIRECTION
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for IFS (Internal Field Separator) injection
 */
export function checkIfsInjection(command: string): SecurityCheckResult {
  const ifsPatterns = [
    /IFS=/,
    /IFS=/,
    /\bIFS\s*=/,
  ]
  
  for (const pattern of ifsPatterns) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: 'IFS injection detected',
        checkId: SECURITY_CHECK_IDS.IFS_INJECTION
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for git commit with substitution
 */
export function checkGitCommitSubstitution(command: string): SecurityCheckResult {
  for (const { pattern, message } of GIT_COMMIT_SUBSTITUTION_PATTERNS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: message,
        checkId: SECURITY_CHECK_IDS.GIT_COMMIT_SUBSTITUTION
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for /procenviron access
 */
export function checkProcEnvironAccess(command: string): SecurityCheckResult {
  for (const { pattern, message } of PROC_ENVIRON_PATTERNS) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: message,
        checkId: SECURITY_CHECK_IDS.PROC_ENVIRON_ACCESS
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for malformed token injection
 */
export function checkMalformedTokenInjection(command: string): SecurityCheckResult {
  // Check for null bytes
  if (command.includes('\x00')) {
    return {
      allowed: false,
      reason: 'Null byte injection detected',
      checkId: SECURITY_CHECK_IDS.MALFORMED_TOKEN_INJECTION
    }
  }
  
  // Check for bell characters
  if (command.includes('\x07')) {
    return {
      allowed: false,
      reason: 'Bell character injection detected',
      checkId: SECURITY_CHECK_IDS.MALFORMED_TOKEN_INJECTION
    }
  }
  
  return { allowed: true }
}

/**
 * Check for backslash-escaped whitespace that might hide commands
 */
export function checkBackslashEscapedWhitespace(command: string): SecurityCheckResult {
  // Pattern: backslash followed by whitespace
  const pattern = /\\[\s\t]+/g
  
  if (pattern.test(command)) {
    // Check if it's at the end of the command (possible truncation)
    if (/\\[\s\t]+$/.test(command)) {
      return {
        allowed: false,
        reason: 'Trailing backslash-escaped whitespace may hide command continuation',
        checkId: SECURITY_CHECK_IDS.BACKSLASH_ESCAPED_WHITESPACE
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for brace expansion
 */
export function checkBraceExpansion(command: string): SecurityCheckResult {
  const bracePattern = /\{[^}]*,[^}]*\}/ 
  
  if (bracePattern.test(command)) {
    return {
      allowed: false,
      reason: 'Brace expansion is not allowed',
      checkId: SECURITY_CHECK_IDS.BRACE_EXPANSION
    }
  }
  
  return { allowed: true }
}

/**
 * Check for control characters
 */
export function checkControlCharacters(command: string): SecurityCheckResult {
  if (CONTROL_CHARACTERS.test(command)) {
    return {
      allowed: false,
      reason: 'Control characters in command are not allowed',
      checkId: SECURITY_CHECK_IDS.CONTROL_CHARACTERS
    }
  }
  
  return { allowed: true }
}

/**
 * Check for unicode whitespace
 */
export function checkUnicodeWhitespace(command: string): SecurityCheckResult {
  if (UNICODE_WHITESPACE.test(command)) {
    return {
      allowed: false,
      reason: 'Unicode whitespace characters in command are not allowed',
      checkId: SECURITY_CHECK_IDS.UNICODE_WHITESPACE
    }
  }
  
  return { allowed: true }
}

/**
 * Check for mid-word hash that might be interpreted as comment
 */
export function checkMidWordHash(command: string): SecurityCheckResult {
  // Pattern: quote-enclosed text followed by #
  const pattern = /['"][^'"]*#/
  
  if (pattern.test(command)) {
    return {
      allowed: false,
      reason: 'Mid-word hash may be interpreted as comment start',
      checkId: SECURITY_CHECK_IDS.MID_WORD_HASH
    }
  }
  
  return { allowed: true }
}

/**
 * Check for Zsh dangerous commands
 */
export function checkZshDangerousCommands(command: string): SecurityCheckResult {
  const words = command.split(/\s+/)
  const baseCommand = words[0].replace(/^['"]|['"]$/g, '')
  
  if (ZSH_DANGEROUS_COMMANDS.has(baseCommand)) {
    return {
      allowed: false,
      reason: `Zsh dangerous command blocked: ${baseCommand}`,
      checkId: SECURITY_CHECK_IDS.ZSH_DANGEROUS_COMMANDS
    }
  }
  
  // Check for zsh-specific options
  const zshOptions = [
    /\bemulate\s+/,
    /\bsetopt\s+[^-]/,
    /\bunsetopt\s+[^-]/,
  ]
  
  for (const pattern of zshOptions) {
    if (pattern.test(command)) {
      return {
        allowed: false,
        reason: 'Zsh-specific options are not allowed',
        checkId: SECURITY_CHECK_IDS.ZSH_DANGEROUS_COMMANDS
      }
    }
  }
  
  return { allowed: true }
}

/**
 * Check for backslash-escaped operators
 */
export function checkBackslashEscapedOperators(command: string): SecurityCheckResult {
  // Backslash-escaped operators like \|
  const pattern = /\\[\|&;<>]/
  
  if (pattern.test(command)) {
    return {
      allowed: false,
      reason: 'Backslash-escaped operators are not allowed',
      checkId: SECURITY_CHECK_IDS.BACKSLASH_ESCAPED_OPERATORS
    }
  }
  
  return { allowed: true }
}

/**
 * Check for comment/quote desynchronization
 */
export function checkCommentQuoteDesync(command: string): SecurityCheckResult {
  // Pattern: # in quotes followed by unquoted content
  const pattern = /['"][^'"]*#['"]?\s+[^#]/
  
  if (pattern.test(command)) {
    return {
      allowed: false,
      reason: 'Potential comment/quote desynchronization detected',
      checkId: SECURITY_CHECK_IDS.COMMENT_QUOTE_DESYNC
    }
  }
  
  return { allowed: true }
}

/**
 * Check for quoted newlines
 */
export function checkQuotedNewline(command: string): SecurityCheckResult {
  // Pattern: $'...' with embedded newlines
  const pattern = /\$\'[^\']*\\n[^\']*\'/
  
  if (pattern.test(command)) {
    return {
      allowed: false,
      reason: 'Quoted newlines ($\'...\\n...\') are not allowed',
      checkId: SECURITY_CHECK_IDS.QUOTED_NEWLINE
    }
  }
  
  return { allowed: true }
}

/**
 * Run all security checks on a command
 */
export function runSecurityChecks(command: string): {
  allowed: boolean
  reasons: string[]
  failedChecks: number[]
} {
  const checks = [
    checkIncompleteCommands,
    checkJqSystemFunction,
    checkJqFileArguments,
    checkObfuscatedFlags,
    checkShellMetacharacters,
    checkDangerousVariables,
    checkNewlines,
    checkCommandSubstitution,
    checkInputRedirection,
    checkOutputRedirection,
    checkIfsInjection,
    checkGitCommitSubstitution,
    checkProcEnvironAccess,
    checkMalformedTokenInjection,
    checkBackslashEscapedWhitespace,
    checkBraceExpansion,
    checkControlCharacters,
    checkUnicodeWhitespace,
    checkMidWordHash,
    checkZshDangerousCommands,
    checkBackslashEscapedOperators,
    checkCommentQuoteDesync,
    checkQuotedNewline,
  ]
  
  const reasons: string[] = []
  const failedChecks: number[] = []
  
  for (const check of checks) {
    const result = check(command)
    if (!result.allowed) {
      reasons.push(result.reason || 'Unknown security check failed')
      if (result.checkId !== undefined) {
        failedChecks.push(result.checkId)
      }
    }
  }
  
  return {
    allowed: reasons.length === 0,
    reasons,
    failedChecks,
  }
}

/**
 * Format security check results for display
 */
export function formatSecurityResult(result: ReturnType<typeof runSecurityChecks>): string {
  if (result.allowed) {
    return 'Security checks passed'
  }
  
  return [
    'Security checks failed:',
    ...result.reasons.map(r => `  - ${r}`),
    `Failed check IDs: ${result.failedChecks.join(', ')}`,
  ].join('\n')
}
