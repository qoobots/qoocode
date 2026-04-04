/**
 * /upgrade - Check for and perform upgrades
 */
import type { Command } from '../../types/message.js'
import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

interface PackageInfo {
  version?: string
}

async function getCurrentVersion(): Promise<string> {
  try {
    // Try to read from package.json
    const packageJsonPath = join(process.cwd(), 'package.json')
    if (existsSync(packageJsonPath)) {
      const content = await readFile(packageJsonPath, 'utf-8')
      const pkg: PackageInfo = JSON.parse(content)
      return pkg.version || '0.1.0'
    }
  } catch {
    // Ignore errors
  }
  return '0.1.0'
}

function checkNpmUpdate(packageName: string): { current: string; latest: string; updateAvailable: boolean } {
  try {
    const current = execSync(`npm show ${packageName} version`, { encoding: 'utf-8', stdio: 'pipe' }).trim()
    const latest = execSync(`npm show ${packageName} dist-tags.latest`, { encoding: 'utf-8', stdio: 'pipe' }).trim()
    
    return {
      current,
      latest,
      updateAvailable: current !== latest,
    }
  } catch {
    return { current: 'unknown', latest: 'unknown', updateAvailable: false }
  }
}

function performNpmUpdate(packageName: string): { success: boolean; message: string } {
  try {
    execSync(`npm install ${packageName}@latest`, { stdio: 'inherit' })
    return { success: true, message: `Successfully updated ${packageName} to latest version` }
  } catch (error) {
    return {
      success: false,
      message: `Failed to update: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export const upgradeCmd: Command = {
  name: 'upgrade',
  aliases: ['update'],
  description: 'Check for and install updates',
  type: 'local',
  async execute(args: string) {
    const parts = args.trim().split(/\s+/)
    const subcommand = parts[0]?.toLowerCase()
    const packageName = parts[1] || 'qoocode'
    
    // Show help
    if (!subcommand || subcommand === 'help') {
      return `  Upgrade Command
  
  Usage: /upgrade [command] [package]
  
  Commands:
    /upgrade check      - Check for updates
    /upgrade install    - Install latest version
    /upgrade help       - Show this help
  
  Examples:
    /upgrade check      - Check qoocode for updates
    /upgrade install    - Update qoocode to latest
    /upgrade check <pkg> - Check a specific package`
    }
    
    // Check for updates
    if (subcommand === 'check' || subcommand === 'info') {
      const currentVersion = await getCurrentVersion()
      
      try {
        const info = checkNpmUpdate(packageName)
        
        const lines = [`Package: ${packageName}`, `Current version: ${info.current}`, `Latest version: ${info.latest}`]
        
        if (info.updateAvailable) {
          lines.push('')
          lines.push('A new version is available!')
          lines.push('Run /upgrade install to update.')
        } else {
          lines.push('')
          lines.push('You are on the latest version.')
        }
        
        return lines.join('\n')
      } catch {
        return `Could not check for updates. Make sure npm is available.`
      }
    }
    
    // Install updates
    if (subcommand === 'install' || subcommand === 'update' || subcommand === 'do') {
      const result = performNpmUpdate(packageName)
      return result.message
    }
    
    // Self-upgrade (default)
    if (subcommand === 'self' || subcommand === 'qoocode') {
      const info = checkNpmUpdate(packageName)
      
      if (!info.updateAvailable) {
        return `qoocode is already on the latest version (${info.current}).`
      }
      
      const result = performNpmUpdate(packageName)
      return result.message
    }
    
    return `Unknown command: ${subcommand}\n\nUse /upgrade help for available commands`
  },
}

export default upgradeCmd
