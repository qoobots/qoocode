/**
 * Permission Management Service
 * 
 * Provides permission management functionality for the CLI.
 */

export type PermissionLevel = 'default' | 'plan' | 'auto' | 'bypassPermissions' | 'sandbox';

export interface PermissionInfo {
  level: PermissionLevel;
  description: string;
  capabilities: string[];
  restrictions: string[];
}

export interface PermissionRule {
  path?: string;
  tool?: string;
  action?: 'allow' | 'deny';
  reason?: string;
}

// Permission level definitions
const PERMISSION_LEVELS: Record<PermissionLevel, PermissionInfo> = {
  'default': {
    level: 'default',
    description: 'Ask for confirmation before dangerous operations',
    capabilities: [
      'File read/write',
      'Directory operations',
      'Git operations',
      'Shell commands',
      'Network requests',
    ],
    restrictions: [
      'Requires confirmation for dangerous operations',
    ],
  },
  'plan': {
    level: 'plan',
    description: 'Enter plan mode before making changes',
    capabilities: [
      'File read/write',
      'Directory operations',
      'Git operations',
      'Shell commands',
      'Network requests',
    ],
    restrictions: [
      'Must enter plan mode before changes',
      'Requires explicit approval for each step',
    ],
  },
  'auto': {
    level: 'auto',
    description: 'Automatically approve safe operations',
    capabilities: [
      'File read/write',
      'Directory operations',
      'Git operations',
      'Shell commands',
      'Network requests',
    ],
    restrictions: [
      'Automatically approves known-safe operations',
    ],
  },
  'bypassPermissions': {
    level: 'bypassPermissions',
    description: 'Bypass all permission checks (use with caution)',
    capabilities: [
      'All operations allowed without confirmation',
    ],
    restrictions: [
      'No safety checks',
      'Use only in trusted environments',
    ],
  },
  'sandbox': {
    level: 'sandbox',
    description: 'Restrict operations to safe sandbox',
    capabilities: [
      'File read within project',
      'Safe shell commands',
    ],
    restrictions: [
      'No file write operations',
      'No system modifications',
      'Network access limited',
    ],
  },
};

/**
 * Get permission level from environment or default
 */
export function getCurrentPermissionLevel(): PermissionLevel {
  const envLevel = process.env.QOOCODE_PERMISSION_MODE;
  
  if (envLevel && PERMISSION_LEVELS[envLevel as PermissionLevel]) {
    return envLevel as PermissionLevel;
  }
  
  return 'default';
}

/**
 * Set permission level
 */
export function setPermissionLevel(level: PermissionLevel): boolean {
  if (!PERMISSION_LEVELS[level]) {
    return false;
  }
  
  process.env.QOOCODE_PERMISSION_MODE = level;
  return true;
}

/**
 * Get permission info for a level
 */
export function getPermissionInfo(level: PermissionLevel): PermissionInfo | undefined {
  return PERMISSION_LEVELS[level];
}

/**
 * Get all available permission levels
 */
export function getAllPermissionLevels(): PermissionLevel[] {
  return Object.keys(PERMISSION_LEVELS) as PermissionLevel[];
}

/**
 * Check if a permission level requires confirmation
 */
export function requiresConfirmation(level: PermissionLevel): boolean {
  return level === 'default' || level === 'plan';
}

/**
 * Check if a permission level bypasses all checks
 */
export function bypassesAllChecks(level: PermissionLevel): boolean {
  return level === 'bypassPermissions';
}

/**
 * Format permission info for display
 */
export function formatPermissionInfo(level: PermissionLevel): string {
  const info = PERMISSION_LEVELS[level];
  if (!info) {
    return `Unknown permission level: ${level}`;
  }
  
  const lines = [
    `Permission Level: ${level}`,
    `Description: ${info.description}`,
    '',
    'Capabilities:',
    ...info.capabilities.map(c => `  - ${c}`),
    '',
    'Restrictions:',
    ...info.restrictions.map(r => `  - ${r}`),
  ];
  
  return lines.join('\n');
}

/**
 * Get permission status summary
 */
export function getPermissionStatus(): {
  currentLevel: PermissionLevel;
  requiresConfirmation: boolean;
  bypassesAllChecks: boolean;
  isSandboxed: boolean;
} {
  const level = getCurrentPermissionLevel();
  
  return {
    currentLevel: level,
    requiresConfirmation: requiresConfirmation(level),
    bypassesAllChecks: bypassesAllChecks(level),
    isSandboxed: level === 'sandbox',
  };
}

/**
 * Validate permission mode value
 */
export function isValidPermissionMode(mode: string): mode is PermissionLevel {
  return mode in PERMISSION_LEVELS;
}

/**
 * Get the help text for permissions
 */
export const PERMISSIONS_HELP = `
Permission Modes:

  default           - Ask for confirmation before dangerous operations
  plan              - Enter plan mode before making changes  
  auto              - Automatically approve safe operations
  bypassPermissions  - Bypass all permission checks (dangerous!)
  sandbox           - Restrict operations to safe sandbox

Usage:
  /permissions              - Show current permission status
  /permissions show         - Show current permission level
  /permissions set <level>   - Set permission level
  /permissions list          - List all available levels
  /permissions help         - Show this help

Examples:
  /permissions set plan     - Enable plan mode
  /permissions set auto      - Enable auto approval
  /permissions set bypassPermissions - Disable all checks (dangerous!)
`;
