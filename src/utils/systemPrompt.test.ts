import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { loadProjectMemory } from './systemPrompt.js'

describe('loadProjectMemory', () => {
  const roots: string[] = []
  const makeDir = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'qoo-mem-'))
    roots.push(dir)
    return dir
  }

  afterEach(() => {
    while (roots.length) {
      const dir = roots.pop()!
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        // ignore cleanup failures
      }
    }
  })

  it('reads CLAUDE.md from the given directory', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'CLAUDE.md'), '# Project rules\nUse tabs, not spaces.')
    const out = loadProjectMemory(dir)
    expect(out).toContain('Project rules')
    expect(out).toContain('CLAUDE.md')
  })

  it('also reads the qoocode.md alias', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'qoocode.md'), 'qoocode-specific project note')
    const out = loadProjectMemory(dir)
    expect(out).toContain('qoocode-specific project note')
    expect(out).toContain('qoocode.md')
  })

  it('walks up parent directories and merges both files', () => {
    const parent = makeDir()
    const child = join(parent, 'packages', 'app')
    mkdirSync(child, { recursive: true })
    writeFileSync(join(parent, 'CLAUDE.md'), 'parent-level rules')
    writeFileSync(join(child, 'qoocode.md'), 'child-level rules')
    const out = loadProjectMemory(child)
    expect(out).toContain('parent-level rules')
    expect(out).toContain('child-level rules')
  })

  it('returns an empty string when no memory files exist', () => {
    const dir = makeDir()
    expect(loadProjectMemory(dir)).toBe('')
  })

  it('truncates overly large memory files', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'CLAUDE.md'), 'x'.repeat(60000))
    const out = loadProjectMemory(dir)
    expect(out).toContain('(truncated)')
    // 单文件上限 50KB，加上文件名标题行仍应远小于原始 60KB
    expect(out.length).toBeLessThan(55000)
  })

  it('does not escape or mangle file contents', () => {
    const dir = makeDir()
    writeFileSync(join(dir, 'CLAUDE.md'), 'Use `rm -rf` carefully with $ENV vars.')
    const out = loadProjectMemory(dir)
    expect(out).toContain('$ENV vars')
  })
})
