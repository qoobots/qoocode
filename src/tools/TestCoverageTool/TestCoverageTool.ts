import { z } from 'zod'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const execAsync = promisify(exec)

const inputSchema = z.object({
  framework: z.enum(['vitest', 'jest', 'all']).optional().describe('Test framework to use'),
  output: z.enum(['text', 'json', 'html']).optional().describe('Output format'),
  threshold: z.number().optional().describe('Coverage threshold percentage'),
  exclude: z.string().optional().describe('Patterns to exclude from coverage'),
})

type Input = z.infer<typeof inputSchema>

interface CoverageReport {
  lines: { total: number; covered: number; pct: number }
  statements: { total: number; covered: number; pct: number }
  functions: { total: number; covered: number; pct: number }
  branches: { total: number; covered: number; pct: number }
  files: Array<{
    file: string
    lines: number
    covered: number
    pct: number
  }>
}

async function runVitestCoverage(): Promise<CoverageReport> {
  const cwd = getCwd()
  const { stdout } = await execAsync('vitest run --coverage', {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  })

  // Parse vitest coverage output
  const linesMatch = stdout.match(/Lines:\s+(\d+)\/(\d+)\s+\((\d+\.\d+)%\)/)
  const statementsMatch = stdout.match(/Statements:\s+(\d+)\/(\d+)\s+\((\d+\.\d+)%\)/)
  const functionsMatch = stdout.match(/Functions:\s+(\d+)\/(\d+)\s+\((\d+\.\d+)%\)/)
  const branchesMatch = stdout.match(/Branches:\s+(\d+)\/(\d+)\s+\((\d+\.\d+)%\)/)

  return {
    lines: {
      total: linesMatch ? parseInt(linesMatch[2]) : 0,
      covered: linesMatch ? parseInt(linesMatch[1]) : 0,
      pct: linesMatch ? parseFloat(linesMatch[3]) : 0,
    },
    statements: {
      total: statementsMatch ? parseInt(statementsMatch[2]) : 0,
      covered: statementsMatch ? parseInt(statementsMatch[1]) : 0,
      pct: statementsMatch ? parseFloat(statementsMatch[3]) : 0,
    },
    functions: {
      total: functionsMatch ? parseInt(functionsMatch[2]) : 0,
      covered: functionsMatch ? parseInt(functionsMatch[1]) : 0,
      pct: functionsMatch ? parseFloat(functionsMatch[3]) : 0,
    },
    branches: {
      total: branchesMatch ? parseInt(branchesMatch[2]) : 0,
      covered: branchesMatch ? parseInt(branchesMatch[1]) : 0,
      pct: branchesMatch ? parseFloat(branchesMatch[3]) : 0,
    },
    files: [],
  }
}

async function runJestCoverage(): Promise<CoverageReport> {
  const cwd = getCwd()
  const { stdout } = await execAsync('jest --coverage --coverageReporters=text', {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  })

  // Parse jest output (simplified)
  const linesMatch = stdout.match(/Lines:\s+(\d+\.\d+)%\s+\((\d+)\/(\d+)\)/)
  const stmtsMatch = stdout.match(/Statements:\s+(\d+\.\d+)%\s+\((\d+)\/(\d+)\)/)
  const funcsMatch = stdout.match(/Functions:\s+(\d+\.\d+)%\s+\((\d+)\/(\d+)\)/)
  const branchMatch = stdout.match(/Branches:\s+(\d+\.\d+)%\s+\((\d+)\/(\d+)\)/)

  return {
    lines: {
      total: linesMatch ? parseInt(linesMatch[3]) : 0,
      covered: linesMatch ? parseInt(linesMatch[2]) : 0,
      pct: linesMatch ? parseFloat(linesMatch[1]) : 0,
    },
    statements: {
      total: stmtsMatch ? parseInt(stmtsMatch[3]) : 0,
      covered: stmtsMatch ? parseInt(stmtsMatch[2]) : 0,
      pct: stmtsMatch ? parseFloat(stmtsMatch[1]) : 0,
    },
    functions: {
      total: funcsMatch ? parseInt(funcsMatch[3]) : 0,
      covered: funcsMatch ? parseInt(funcsMatch[2]) : 0,
      pct: funcsMatch ? parseFloat(funcsMatch[1]) : 0,
    },
    branches: {
      total: branchMatch ? parseInt(branchMatch[3]) : 0,
      covered: branchMatch ? parseInt(branchMatch[2]) : 0,
      pct: branchMatch ? parseFloat(branchMatch[1]) : 0,
    },
    files: [],
  }
}

function formatCoverageBar(pct: number): string {
  const filled = Math.round(pct / 10)
  const empty = 10 - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

export const TestCoverageTool = buildTool({
  name: 'TestCoverage',
  aliases: ['coverage', 'test-coverage', 'cov'],
  description:
    'Run tests with coverage analysis. Shows line, statement, function, and branch coverage.',
  inputSchema,
  maxResultSizeChars: 30_000,

  async call(input: Input): Promise<ToolResult> {
    const cwd = getCwd()
    const framework = input.framework ?? 'all'
    const threshold = input.threshold ?? 0

    // Detect test framework if not specified
    let testFramework = framework
    if (framework === 'all') {
      if (existsSync(`${cwd}/vitest.config.ts`) || existsSync(`${cwd}/vitest.config.js`)) {
        testFramework = 'vitest'
      } else if (existsSync(`${cwd}/jest.config.js`) || existsSync(`${cwd}/jest.config.ts`)) {
        testFramework = 'jest'
      } else {
        return {
          data: { error: 'No test framework detected' },
          content: `Error: Cannot detect a test framework.

Please specify a framework: vitest or jest`,
        }
      }
    }

    try {
      const report = testFramework === 'vitest'
        ? await runVitestCoverage()
        : await runJestCoverage()

      // Check threshold
      if (threshold > 0 && report.lines.pct < threshold) {
        return {
          data: { ...report, threshold, passed: false },
          content: `❌ Coverage below threshold!\n\nExpected: ${threshold}%\nActual: ${report.lines.pct.toFixed(2)}%`,
        }
      }

      // Format output
      let content = `📊 **Test Coverage Report** (${testFramework})\n\n`

      content += `**Lines:**     ${formatCoverageBar(report.lines.pct)} ${report.lines.pct.toFixed(2)}%\n`
      content += `**Statements:** ${formatCoverageBar(report.statements.pct)} ${report.statements.pct.toFixed(2)}%\n`
      content += `**Functions:**  ${formatCoverageBar(report.functions.pct)} ${report.functions.pct.toFixed(2)}%\n`
      content += `**Branches:**   ${formatCoverageBar(report.branches.pct)} ${report.branches.pct.toFixed(2)}%\n\n`

      content += `---
**Summary:**
- Lines: ${report.lines.covered}/${report.lines.total} (${report.lines.pct.toFixed(2)}%)
- Statements: ${report.statements.covered}/${report.statements.total} (${report.statements.pct.toFixed(2)}%)
- Functions: ${report.functions.covered}/${report.functions.total} (${report.functions.pct.toFixed(2)}%)
- Branches: ${report.branches.covered}/${report.branches.total} (${report.branches.pct.toFixed(2)}%)`

      const passed = threshold === 0 || report.lines.pct >= threshold

      return {
        data: { ...report, threshold, passed },
        content,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        data: { error: message },
        content: `❌ Coverage failed: ${message}`,
      }
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `TestCoverage(${input?.framework ?? 'auto'})`
  },
})
