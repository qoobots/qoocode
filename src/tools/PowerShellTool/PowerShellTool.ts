/**
 * PowerShell Tool for Windows
 * 
 * Provides PowerShell command execution on Windows systems.
 * Similar to BashTool but for Windows PowerShell.
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import { buildTool } from '../../Tool.js';

const execAsync = promisify(exec);

// PowerShell search/read commands for collapsible display
const PS_SEARCH_COMMANDS = new Set([
  'select-string',  // grep equivalent
  'get-childitem', // find equivalent
  'findstr',        // native Windows search
  'where.exe',      // native Windows which
]);

const PS_READ_COMMANDS = new Set([
  'get-content',    // cat equivalent
  'get-item',       // file info
  'test-path',      // test -e equivalent
  'resolve-path',   // realpath equivalent
  'get-process',    // ps equivalent
  'get-service',     // system info
]);

/**
 * Check if PowerShell is available on the system
 */
export async function isPowerShellAvailable(): Promise<boolean> {
  if (platform() !== 'win32') {
    return false;
  }
  
  try {
    await execAsync('where.exe powershell.exe', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the PowerShell executable path
 */
async function getPowerShellPath(): Promise<string> {
  // Try to find PowerShell Core first (pwsh), then fall back to Windows PowerShell
  try {
    const { stdout } = await execAsync('where.exe pwsh.exe', { timeout: 5000 });
    return stdout.trim().split('\n')[0];
  } catch {
    // Fall back to Windows PowerShell
    return 'powershell.exe';
  }
}

/**
 * Execute a PowerShell command
 */
async function executePowerShell(
  command: string,
  timeout: number = 30000,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const psPath = await getPowerShellPath();
  
  return new Promise((resolve) => {
    const psCommand = command.includes(';') 
      ? command 
      : command;
    
    const child = spawn(psPath, [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      psCommand,
    ], {
      timeout,
      windowsHide: true,
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
      });
    });
    
    child.on('error', (err) => {
      resolve({
        stdout: '',
        stderr: err.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * Classify the command type for display
 */
function classifyCommand(command: string): 'search' | 'read' | 'write' | 'execute' {
  const normalized = command.toLowerCase().trim();
  
  // Check first word (cmdlet name)
  const firstWord = normalized.split(/\s+/)[0];
  
  if (PS_SEARCH_COMMANDS.has(firstWord)) {
    return 'search';
  }
  
  if (PS_READ_COMMANDS.has(firstWord)) {
    return 'read';
  }
  
  // Write/modify commands
  const writeKeywords = ['new-', 'set-', 'remove-', 'add-', 'clear-', 'rename-', 'copy-', 'move-', 'delete-'];
  if (writeKeywords.some(kw => normalized.startsWith(kw))) {
    return 'write';
  }
  
  return 'execute';
}

/**
 * Create the PowerShell tool
 */
export const PowerShellTool = buildTool({
  name: 'powershell',
  description: 'Execute PowerShell commands on Windows systems',
  
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The PowerShell command to execute',
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds (default: 30000)',
        default: 30000,
      },
    },
    required: ['command'],
  },
  
  isEnabled: () => platform() === 'win32',
  
  async execute(params: { command: string; timeout?: number }, { signal }) {
    // Validate command
    if (!params.command?.trim()) {
      return {
        tool: 'powershell',
        output: 'Error: No command provided',
        error: 'command_required',
      };
    }
    
    // Check if PowerShell is available
    const available = await isPowerShellAvailable();
    if (!available) {
      return {
        tool: 'powershell',
        output: 'Error: PowerShell is not available on this system',
        error: 'powershell_unavailable',
      };
    }
    
    // Execute with timeout support
    const timeout = params.timeout ?? 30000;
    
    try {
      const result = await Promise.race([
        executePowerShell(params.command, timeout),
        new Promise<never>((_, reject) => 
          signal?.addEventListener('abort', () => reject(new Error('Command timed out')))
        ),
      ]);
      
      const commandType = classifyCommand(params.command);
      
      // Format output based on command type
      let output = `PS> ${params.command}\n`;
      
      if (result.stdout) {
        output += result.stdout;
      }
      
      if (result.stderr) {
        output += `\n[Error]\n${result.stderr}`;
      }
      
      if (result.exitCode !== 0 && !result.stderr) {
        output += `\n[Exit Code: ${result.exitCode}]`;
      }
      
      return {
        tool: 'powershell',
        output: output.trim(),
        metadata: {
          exitCode: result.exitCode,
          commandType,
        },
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          return {
            tool: 'powershell',
            output: `Error: Command timed out after ${timeout}ms`,
            error: 'timeout',
          };
        }
        return {
          tool: 'powershell',
          output: `Error: ${error.message}`,
          error: 'execution_error',
        };
      }
      
      return {
        tool: 'powershell',
        output: 'Error: Unknown error occurred',
        error: 'unknown_error',
      };
    }
  },
});

export default PowerShellTool;
