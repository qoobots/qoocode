/**
 * Doctor - System diagnostic tool for QOOCODE
 * Checks system configuration and reports potential issues
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { homedir, platform } from 'os';

const execAsync = promisify(exec);

export interface DiagnosticResult {
  category: string;
  items: DiagnosticItem[];
}

export interface DiagnosticItem {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

export interface SystemDiagnostics {
  installation: DiagnosticResult;
  dependencies: DiagnosticResult;
  configuration: DiagnosticResult;
  environment: DiagnosticResult;
}

/**
 * Get the current QOOCODE version
 */
function getVersion(): string {
  try {
    // Try to read from package.json
    const packageJson = require('../package.json');
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Check if a command exists in PATH
 */
async function commandExists(command: string): Promise<boolean> {
  try {
    const cmd = platform() === 'win32' ? `where ${command}` : `which ${command}`;
    await execAsync(cmd);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Node.js/Bun version
 */
function getRuntimeVersion(): string {
  // Bun sets BUN_VERSION environment variable
  if (process.env.BUN_VERSION) {
    return `Bun ${process.env.BUN_VERSION}`;
  }
  // Node.js
  return `Node ${process.version}`;
}

/**
 * Check API configuration
 */
async function checkApiConfiguration(): Promise<DiagnosticItem[]> {
  const items: DiagnosticItem[] = [];
  
  const openaiKey = process.env.OPENAI_API_KEY;
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  
  if (openaiKey) {
    items.push({
      name: 'OpenAI API Key',
      status: 'ok',
      message: 'Configured',
      details: `Model: ${process.env.OPENAI_MODEL || 'gpt-4o'}`,
    });
  } else if (deepseekKey) {
    items.push({
      name: 'DeepSeek API Key',
      status: 'ok',
      message: 'Configured',
      details: `Model: ${process.env.DEEPSEEK_MODEL || 'deepseek-chat'}`,
    });
  } else {
    items.push({
      name: 'API Configuration',
      status: 'warning',
      message: 'No API key configured',
      details: 'Set OPENAI_API_KEY or DEEPSEEK_API_KEY environment variable',
    });
  }
  
  return items;
}

/**
 * Check system dependencies
 */
async function checkDependencies(): Promise<DiagnosticResult> {
  const items: DiagnosticItem[] = [];
  
  // Check Bun
  const bunExists = await commandExists('bun');
  items.push({
    name: 'Bun Runtime',
    status: bunExists ? 'ok' : 'error',
    message: bunExists ? `Found: ${getRuntimeVersion()}` : 'Not found',
    details: bunExists ? 'Required for running QOOCODE' : 'Install Bun from https://bun.sh',
  });
  
  // Check Git
  const gitExists = await commandExists('git');
  items.push({
    name: 'Git',
    status: gitExists ? 'ok' : 'warning',
    message: gitExists ? 'Available' : 'Not found',
    details: gitExists ? 'Required for Git operations' : 'Recommended for version control',
  });
  
  // Check ripgrep
  const rgExists = await commandExists('rg');
  items.push({
    name: 'ripgrep',
    status: rgExists ? 'ok' : 'warning',
    message: rgExists ? 'Available' : 'Not found',
    details: rgExists ? 'Used for content search' : 'Recommended for faster search',
  });
  
  // Check Node.js (fallback)
  const nodeExists = await commandExists('node');
  if (!bunExists && nodeExists) {
    items.push({
      name: 'Node.js (Fallback)',
      status: 'warning',
      message: `Available: ${process.version}`,
      details: 'Bun is recommended for better performance',
    });
  }
  
  return {
    category: 'Dependencies',
    items,
  };
}

/**
 * Check environment configuration
 */
async function checkEnvironment(): Promise<DiagnosticResult> {
  const items: DiagnosticItem[] = [];
  
  // Platform
  items.push({
    name: 'Platform',
    status: 'ok',
    message: platform(),
    details: process.arch,
  });
  
  // Home directory
  items.push({
    name: 'Home Directory',
    status: 'ok',
    message: homedir(),
  });
  
  // Current working directory
  items.push({
    name: 'Working Directory',
    status: 'ok',
    message: process.cwd(),
  });
  
  // Config file check
  try {
    const configPath = join(process.cwd(), 'QOOCODE.json');
    await readFile(configPath, 'utf-8');
    items.push({
      name: 'Config File',
      status: 'ok',
      message: 'Found: QOOCODE.json',
    });
  } catch {
    items.push({
      name: 'Config File',
      status: 'warning',
      message: 'Not found',
      details: 'Will use default configuration',
    });
  }
  
  return {
    category: 'Environment',
    items,
  };
}

/**
 * Check configuration settings
 */
async function checkConfiguration(): Promise<DiagnosticResult> {
  const items: DiagnosticItem[] = [];
  
  // Check permission mode
  const permissionMode = process.env.QOOCODE_PERMISSION_MODE || 'default';
  items.push({
    name: 'Permission Mode',
    status: 'ok',
    message: permissionMode,
    details: permissionMode === 'bypassPermissions' 
      ? 'All operations allowed' 
      : 'Restricted by permission settings',
  });
  
  // Check debug mode
  const isDebug = process.env.QOOCODE_DEBUG === 'true';
  items.push({
    name: 'Debug Mode',
    status: isDebug ? 'warning' : 'ok',
    message: isDebug ? 'Enabled' : 'Disabled',
    details: isDebug ? 'Verbose logging is active' : 'Normal logging',
  });
  
  // Check API configuration
  const apiItems = await checkApiConfiguration();
  
  return {
    category: 'Configuration',
    items: [...items, ...apiItems],
  };
}

/**
 * Get installation information
 */
async function getInstallationInfo(): Promise<DiagnosticResult> {
  const items: DiagnosticItem[] = [];
  
  // Version
  items.push({
    name: 'QOOCODE Version',
    status: 'ok',
    message: getVersion(),
  });
  
  // Runtime
  items.push({
    name: 'Runtime',
    status: 'ok',
    message: getRuntimeVersion(),
  });
  
  // Installation source
  items.push({
    name: 'Installation',
    status: 'ok',
    message: 'Source',
    details: 'Built from source',
  });
  
  return {
    category: 'Installation',
    items,
  };
}

/**
 * Run all diagnostic checks
 */
export async function runDiagnostics(): Promise<SystemDiagnostics> {
  const [installation, dependencies, configuration, environment] = await Promise.all([
    getInstallationInfo(),
    checkDependencies(),
    checkConfiguration(),
    checkEnvironment(),
  ]);
  
  return {
    installation,
    dependencies,
    configuration,
    environment,
  };
}

/**
 * Format diagnostics for console output
 */
export function formatDiagnostics(diagnostics: SystemDiagnostics): string {
  const lines: string[] = [];
  
  const formatResult = (result: DiagnosticResult) => {
    lines.push(`\n${result.category}:`);
    for (const item of result.items) {
      const icon = item.status === 'ok' ? '✓' : item.status === 'warning' ? '⚠' : '✗';
      lines.push(`  ${icon} ${item.name}: ${item.message}`);
      if (item.details) {
        lines.push(`    → ${item.details}`);
      }
    }
  };
  
  lines.push('═'.repeat(50));
  lines.push('  QOOCODE System Diagnostics');
  lines.push('═'.repeat(50));
  
  formatResult(diagnostics.installation);
  formatResult(diagnostics.dependencies);
  formatResult(diagnostics.configuration);
  formatResult(diagnostics.environment);
  
  lines.push('\n' + '═'.repeat(50));
  
  return lines.join('\n');
}

/**
 * Get summary of diagnostics
 */
export function getDiagnosticsSummary(diagnostics: SystemDiagnostics): { 
  total: number; 
  ok: number; 
  warnings: number; 
  errors: number;
} {
  let ok = 0, warnings = 0, errors = 0;
  
  const countItems = (result: DiagnosticResult) => {
    for (const item of result.items) {
      if (item.status === 'ok') ok++;
      else if (item.status === 'warning') warnings++;
      else errors++;
    }
  };
  
  countItems(diagnostics.installation);
  countItems(diagnostics.dependencies);
  countItems(diagnostics.configuration);
  countItems(diagnostics.environment);
  
  return { total: ok + warnings + errors, ok, warnings, errors };
}
