// Bughunter Command - Automated bug hunting
// Scans codebase for common bugs, anti-patterns, and issues
import { z } from 'zod'

// Input schema
export const bughunterInputSchema = z.object({
  action: z.enum(['scan', 'patterns', 'fix', 'report']).optional().default('scan').describe('Bughunter action'),
  target: z.string().optional().describe('Target directory or file to scan'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Filter by severity'),
})
export type BughunterInput = z.infer<typeof bughunterInputSchema>

// Bug patterns to detect
interface BugPattern {
  id: string
  name: string
  pattern: RegExp
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  suggestion: string
}

const BUG_PATTERNS: BugPattern[] = [
  {
    id: 'TODO',
    name: 'TODO Comments',
    pattern: /\/\/\s*TODO|\/\/\s*FIXME|\/\/\s*HACK/,
    severity: 'low',
    message: 'Unresolved TODO/FIXME/HACK comment found',
    suggestion: 'Address the TODO or create a tracking issue',
  },
  {
    id: 'CONSOLE_LOG',
    name: 'Console Log Statements',
    pattern: /console\.(log|debug|info)/,
    severity: 'medium',
    message: 'Console log statement in production code',
    suggestion: 'Remove or replace with proper logging',
  },
  {
    id: 'EMPTY_CATCH',
    name: 'Empty Catch Block',
    pattern: /catch\s*\([^)]*\)\s*{\s*}/,
    severity: 'high',
    message: 'Empty catch block that silently ignores errors',
    suggestion: 'Add error handling or logging',
  },
  {
    id: 'TYPECAST_ANY',
    name: 'Type Casting to any',
    pattern: /as\s+any|\<\s*any\s*\>|:\s*any\s*[=;]/,
    severity: 'medium',
    message: 'TypeScript type cast to any',
    suggestion: 'Use proper type annotations',
  },
  {
    id: 'HARD_CODED_SECRET',
    name: 'Hardcoded Secret',
    pattern: /(password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]+['"]/i,
    severity: 'critical',
    message: 'Potential hardcoded secret or credential',
    suggestion: 'Move to environment variables or config',
  },
  {
    id: 'SQL_INJECTION',
    name: 'Potential SQL Injection',
    pattern: /query\s*\(\s*`.*\$\{/,
    severity: 'critical',
    message: 'Potential SQL injection vulnerability',
    suggestion: 'Use parameterized queries',
  },
  {
    id: 'XSS',
    name: 'Potential XSS',
    pattern: /innerHTML\s*=|dangerouslySetInnerHTML/,
    severity: 'high',
    message: 'Potential XSS vulnerability',
    suggestion: 'Sanitize user input before rendering',
  },
  {
    id: 'SYNC_AWAIT',
    name: 'Sync/Await Mismatch',
    pattern: /await\s+[^;]*;\s*$/m,
    severity: 'low',
    message: 'Potential sync/await mismatch',
    suggestion: 'Ensure async functions are properly awaited',
  },
]

// Output interface
export interface BughunterOutput {
  success: boolean
  message: string
  bugs?: Bug[]
  stats?: {
    filesScanned: number
    issuesFound: number
    bySeverity: Record<string, number>
  }
}

export interface Bug {
  id: string
  name: string
  severity: string
  file: string
  line: number
  message: string
  suggestion: string
  code?: string
}

/**
 * Scan file for bugs
 */
async function scanFile(filePath: string, patterns: BugPattern[]): Promise<Bug[]> {
  const bugs: Bug[] = []
  
  try {
    // Dynamic import to avoid issues with ESM
    const fs = await import('fs')
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags)
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          bugs.push({
            id: pattern.id,
            name: pattern.name,
            severity: pattern.severity,
            file: filePath,
            line: i + 1,
            message: pattern.message,
            suggestion: pattern.suggestion,
            code: lines[i].trim(),
          })
        }
      }
    }
  } catch {
    // Skip files that can't be read
  }
  
  return bugs
}

/**
 * Scan directory recursively
 */
async function scanDirectory(dir: string, patterns: BugPattern[]): Promise<{ bugs: Bug[]; filesScanned: number }> {
  const bugs: Bug[] = []
  let filesScanned = 0
  
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      // Skip node_modules and hidden directories
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const result = await scanDirectory(fullPath, patterns)
          bugs.push(...result.bugs)
          filesScanned += result.filesScanned
        }
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const fileBugs = await scanFile(fullPath, patterns)
        bugs.push(...fileBugs)
        filesScanned++
      }
    }
  } catch {
    // Skip directories that can't be read
  }
  
  return { bugs, filesScanned }
}

/**
 * Execute bughunter command
 */
export async function executeBughunterCommand(input: BughunterInput): Promise<BughunterOutput> {
  const { action = 'scan', target, severity } = input

  switch (action) {
    case 'patterns': {
      return {
        success: true,
        message: `
Bug Hunter Patterns
===================

Available patterns:

${BUG_PATTERNS.map(p => {
  const icon = p.severity === 'critical' ? '🔴' : 
               p.severity === 'high' ? '🟠' : 
               p.severity === 'medium' ? '🟡' : '🟢'
  return `${icon} ${p.id.padEnd(15)} [${p.severity.padEnd(8)}] ${p.name}`
}).join('\n')}

Use /bughunter scan to run the detector.
`,
      }
    }

    case 'scan': {
      const scanPath = target || process.cwd()
      const patterns = severity 
        ? BUG_PATTERNS.filter(p => p.severity === severity)
        : BUG_PATTERNS
      
      const result = await scanDirectory(scanPath, patterns)
      
      // Count by severity
      const bySeverity: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
      for (const bug of result.bugs) {
        bySeverity[bug.severity]++
      }
      
      // Sort bugs by severity
      const sortedBugs = result.bugs.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 }
        return order[a.severity as keyof typeof order] - order[b.severity as keyof typeof order]
      })
      
      const bugList = sortedBugs.slice(0, 20).map(bug => {
        const icon = bug.severity === 'critical' ? '🔴' : 
                     bug.severity === 'high' ? '🟠' : 
                     bug.severity === 'medium' ? '🟡' : '🟢'
        return `${icon} ${bug.file}:${bug.line}\n  ${bug.name} (${bug.severity})\n  ${bug.code ? `  \`${bug.code.slice(0, 60)}...\`` : ''}`
      }).join('\n\n')
      
      return {
        success: true,
        message: `
Bug Hunter Scan Results
=======================

Scanned: ${result.filesScanned} files
Found:   ${result.bugs.length} issues

By Severity:
  🔴 Critical: ${bySeverity.critical}
  🟠 High:     ${bySeverity.high}
  🟡 Medium:   ${bySeverity.medium}
  🟢 Low:      ${bySeverity.low}

${bugList || 'No bugs found!'}

${result.bugs.length > 20 ? `\n... and ${result.bugs.length - 20} more issues` : ''}
`,
        bugs: sortedBugs,
        stats: {
          filesScanned: result.filesScanned,
          issuesFound: result.bugs.length,
          bySeverity,
        },
      }
    }

    case 'report': {
      return {
        success: true,
        message: `
Bug Hunter Report
=================

Run /bughunter scan to detect issues.

Use /bughunter patterns to see available detection patterns.
Use /bughunter scan severity=high to filter by severity.
`,
      }
    }

    default:
      return {
        success: false,
        message: `Unknown action: ${action}\n\nAvailable: scan, patterns, report`,
      }
  }
}
