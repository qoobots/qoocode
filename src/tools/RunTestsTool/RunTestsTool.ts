import { z } from 'zod'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { buildTool } from '../../Tool.js'
import { getCwd } from '../../utils/cwd.js'
import type { ToolResult } from '../../Tool.js'

const execAsync = promisify(exec)

const inputSchema = z.object({
  mode: z.enum(['run', 'watch', 'coverage', 'list', 'debug']).optional().describe('Test mode'),
  framework: z.enum(['vitest', 'jest', 'mocha', 'pytest', 'go', 'cargo']).optional().describe('Test framework'),
  files: z.string().optional().describe('Test files or patterns to run'),
  options: z.string().optional().describe('Additional command options'),
})

type Input = z.infer<typeof inputSchema>

interface TestResult {
  exitCode: number
  stdout: string
  stderr: string
  duration?: number
  passed?: number
  failed?: number
  skipped?: number
}

async function runTestCommand(cmd: string, cwd?: string): Promise<TestResult> {
  const workDir = cwd ?? getCwd()
  const startTime = Date.now()

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: workDir,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300000, // 5 min timeout
    })
    const duration = Date.now() - startTime

    return {
      exitCode: 0,
      stdout,
      stderr,
      duration,
    }
  } catch (error: unknown) {
    const err = error as { stdout?: string; stderr?: string; code?: number }
    const duration = Date.now() - startTime
    return {
      exitCode: err.code ?? 1,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      duration,
    }
  }
}

function detectTestFramework(): string | null {
  const cwd = getCwd()

  if (existsSync(`${cwd}/vitest.config.ts`) || existsSync(`${cwd}/vitest.config.js`) || existsSync(`${cwd}/vitest.config.mjs`)) {
    return 'vitest'
  }
  if (existsSync(`${cwd}/jest.config.js`) || existsSync(`${cwd}/jest.config.ts`)) {
    return 'jest'
  }
  if (existsSync(`${cwd}/package.json`)) {
    try {
      const pkg = require(`${cwd}/package.json`)
      if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) return 'vitest'
      if (pkg.devDependencies?.jest || pkg.dependencies?.jest) return 'jest'
      if (pkg.devDependencies?.mocha) return 'mocha'
    } catch {
      // ignore
    }
  }
  if (existsSync(`${cwd}/pytest.ini`) || existsSync(`${cwd}/setup.cfg`) || existsSync(`${cwd}/pyproject.toml`)) {
    return 'pytest'
  }
  if (existsSync(`${cwd}/Cargo.toml`)) {
    return 'cargo'
  }

  return null
}

function parseTestResults(framework: string, stdout: string): { passed: number; failed: number; skipped: number } {
  let passed = 0
  let failed = 0
  let skipped = 0

  if (framework === 'vitest') {
    // Parse vitest output like "✓ 10 passed"
    const passedMatch = stdout.match(/✓\s+(\d+)\s+passed/)
    const failedMatch = stdout.match(/✗\s+(\d+)\s+failed/)
    const skippedMatch = stdout.match(/(\d+)\s+skipped/)
    passed = passedMatch ? parseInt(passedMatch[1], 10) : 0
    failed = failedMatch ? parseInt(failedMatch[1], 10) : 0
    skipped = skippedMatch ? parseInt(skippedMatch[1], 10) : 0
  } else if (framework === 'jest') {
    const passedMatch = stdout.match(/Tests:\s+(\d+)\s+passed/)
    const failedMatch = stdout.match(/Tests:\s+.*?(\d+)\s+failed/)
    passed = passedMatch ? parseInt(passedMatch[1], 10) : 0
    failed = failedMatch ? parseInt(failedMatch[1], 10) : 0
  }

  return { passed, failed, skipped }
}

export const RunTestsTool = buildTool({
  name: 'RunTests',
  aliases: ['test', 'runtests', 'jest', 'vitest'],
  description:
    'Run tests using various test frameworks. Supports run, watch, coverage, and list modes.',
  inputSchema,
  maxResultSizeChars: 50_000,

  async call(input: Input): Promise<ToolResult> {
    const cwd = getCwd()
    const mode = input.mode ?? 'run'
    const framework = input.framework ?? detectTestFramework() ?? 'vitest'
    const files = input.files ?? ''
    const options = input.options ?? ''

    if (!framework) {
      return {
        data: { error: 'No test framework detected' },
        content: `Error: Cannot detect a test framework.

Please specify a framework manually:
- vitest (default)
- jest
- mocha
- pytest
- go (go test)
- cargo (Rust)`,
      }
    }

    let cmd = ''

    switch (mode) {
      case 'run':
        if (framework === 'vitest') cmd = `vitest run ${files} ${options}`.trim()
        else if (framework === 'jest') cmd = `jest ${files} ${options}`.trim()
        else if (framework === 'mocha') cmd = `mocha ${files} ${options}`.trim()
        else if (framework === 'pytest') cmd = `pytest ${files} ${options}`.trim()
        else if (framework === 'go') cmd = `go test ${files} ${options}`.trim()
        else if (framework === 'cargo') cmd = `cargo test ${files} ${options}`.trim()
        break

      case 'watch':
        if (framework === 'vitest') cmd = `vitest --watch ${files} ${options}`.trim()
        else if (framework === 'jest') cmd = `jest --watch ${files} ${options}`.trim()
        else cmd = `${framework} --watch`
        break

      case 'coverage':
        if (framework === 'vitest') cmd = `vitest run --coverage ${files} ${options}`.trim()
        else if (framework === 'jest') cmd = `jest --coverage ${files} ${options}`.trim()
        else cmd = `${framework} --coverage`
        break

      case 'list':
        if (framework === 'vitest') cmd = `vitest --list ${files} ${options}`.trim()
        else if (framework === 'jest') cmd = `jest --listTests ${files} ${options}`.trim()
        else cmd = `${framework} --list`
        break

      case 'debug':
        cmd = `node --inspect-brk ${framework} ${files} ${options}`.trim()
        break

      default:
        return { data: { error: `Unknown mode: ${mode}` }, content: `Unknown mode: ${mode}` }
    }

    const result = await runTestCommand(cmd, cwd)
    const parsed = parseTestResults(framework, result.stdout)

    const statusEmoji = result.exitCode === 0 ? '✅' : '❌'
    const durationStr = result.duration ? ` (${(result.duration / 1000).toFixed(2)}s)` : ''

    let content = `🧪 Test Results (${framework})${durationStr}\n\n`

    if (parsed.passed > 0 || parsed.failed > 0 || parsed.skipped > 0) {
      content += `Passed: ${parsed.passed} | Failed: ${parsed.failed} | Skipped: ${parsed.skipped}\n\n`
    }

    if (result.exitCode === 0) {
      content += `${statusEmoji} All tests passed!`
      if (mode === 'watch') content += '\n\nWatching for changes...'
    } else {
      content += `${statusEmoji} Tests failed\n\n`
      content += result.stderr || result.stdout
    }

    return {
      data: {
        mode,
        framework,
        exitCode: result.exitCode,
        passed: parsed.passed,
        failed: parsed.failed,
        skipped: parsed.skipped,
        duration: result.duration,
      },
      content,
    }
  },

  isReadOnly() {
    return false
  },

  userFacingName(input?: Partial<Input>) {
    return `RunTests(${input?.mode ?? 'run'}:${input?.framework ?? 'auto'})`
  },
})
