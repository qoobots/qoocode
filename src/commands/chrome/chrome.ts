/**
 * Chrome Command Handler
 * 
 * Handles the /chrome command for Chrome browser integration.
 * Currently shows status - full integration may be added in future.
 */

import type { Command, CommandResult } from '../../types/message.js';
import {
  getChromeStatus,
} from '../../services/chrome/chromeService.js';

/**
 * Execute chrome command
 */
export async function executeChromeCommand(args: string): Promise<CommandResult> {
  const parts = args.trim().split(/\s+/);
  const action = (parts[0] || 'status').toLowerCase();

  switch (action) {
    case 'status':
    case 'info':
      return executeStatusCommand();
    
    case 'help':
    case '?':
      return {
        success: true,
        message: `Chrome Browser Integration
========================

Usage: /chrome [action]

Actions:
  /chrome status   - Show Chrome integration status
  /chrome help     - Show this help

Status:
  Chrome browser integration is currently not available.
  This feature may be added in a future version.`,
      };
    
    default:
      return {
        success: false,
        message: `Unknown action: ${action}\n\nUse /chrome help for available actions.`,
      };
  }
}

/**
 * Execute status command - show Chrome integration status
 */
async function executeStatusCommand(): Promise<CommandResult> {
  try {
    const status = await getChromeStatus();
    return {
      success: true,
      message: `Chrome Browser Integration
========================

Chrome installed: ${status.installed ? 'Yes' : 'No'}
Integration available: ${status.available ? 'Yes' : 'No'}

This feature may be added in a future version.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get Chrome status: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Chrome command definition
 */
export const chromeCmd: Command = {
  name: 'chrome',
  aliases: ['browser', 'chromium'],
  description: 'Chrome browser integration status',
  type: 'local',
  async execute(args: string) {
    const result = await executeChromeCommand(args);
    return result.message;
  },
};
