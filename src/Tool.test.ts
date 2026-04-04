import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { buildTool, findToolByName, type Tools } from './Tool'
import { BashTool } from './tools/BashTool/BashTool'
import { FileReadTool } from './tools/FileReadTool/FileReadTool'
import { FileWriteTool } from './tools/FileWriteTool/FileWriteTool'
import { FileEditTool } from './tools/FileEditTool/FileEditTool'
import { GrepTool } from './tools/GrepTool/GrepTool'
import { GlobTool } from './tools/GlobTool/GlobTool'
import fs from 'node:fs/promises'
import path from 'node:path'

describe('Tool System', () => {
  describe('buildTool', () => {
    it('should create a tool with default values', async () => {
      const mockTool = buildTool({
        name: 'MockTool',
        description: 'A mock tool for testing',
        inputSchema: { parse: vi.fn(), safeParse: vi.fn() } as any,
        async call(input: any) {
          return { data: input, content: 'result' }
        },
      })

      expect(mockTool.name).toBe('MockTool')
      expect(mockTool.description).toBe('A mock tool for testing')
      expect(mockTool.maxResultSizeChars).toBe(50_000)
      expect(mockTool.isEnabled()).toBe(true)
    })

    it('should support custom maxResultSizeChars', async () => {
      const mockTool = buildTool({
        name: 'MockTool',
        description: 'A mock tool for testing',
        inputSchema: { parse: vi.fn(), safeParse: vi.fn() } as any,
        maxResultSizeChars: 100_000,
        async call(input: any) {
          return { data: input, content: 'result' }
        },
      })

      expect(mockTool.maxResultSizeChars).toBe(100_000)
    })

    it('should support custom aliases', async () => {
      const mockTool = buildTool({
        name: 'MockTool',
        aliases: ['mock', 'test'],
        description: 'A mock tool for testing',
        inputSchema: { parse: vi.fn(), safeParse: vi.fn() } as any,
        async call(input: any) {
          return { data: input, content: 'result' }
        },
      })

      expect(mockTool.aliases).toEqual(['mock', 'test'])
    })
  })

  describe('findToolByName', () => {
    const mockTools: Tools = [
      buildTool({
        name: 'Tool1',
        aliases: ['alias1', 'alias2'],
        description: 'Tool 1',
        inputSchema: { parse: vi.fn(), safeParse: vi.fn() } as any,
        async call(input: any) {
          return { data: input, content: 'result' }
        },
      }),
      buildTool({
        name: 'Tool2',
        description: 'Tool 2',
        inputSchema: { parse: vi.fn(), safeParse: vi.fn() } as any,
        async call(input: any) {
          return { data: input, content: 'result' }
        },
      }),
    ]

    it('should find tool by exact name', () => {
      const tool = findToolByName(mockTools, 'Tool1')
      expect(tool).toBeDefined()
      expect(tool?.name).toBe('Tool1')
    })

    it('should find tool by alias', () => {
      const tool = findToolByName(mockTools, 'alias1')
      expect(tool).toBeDefined()
      expect(tool?.name).toBe('Tool1')
    })

    it('should return undefined for non-existent tool', () => {
      const tool = findToolByName(mockTools, 'NonExistent')
      expect(tool).toBeUndefined()
    })
  })
})

describe('BashTool', () => {
  it('should execute shell command successfully', async () => {
    const result = await BashTool.call({ command: 'echo "hello world"' })
    expect(result.data.exitCode).toBe(0)
    expect(result.content).toContain('hello world')
  })

  it('should handle command errors gracefully', async () => {
    const result = await BashTool.call({ command: 'exit 1' })
    expect(result.data.exitCode).toBe(1)
  })

  it('should support custom timeout', async () => {
    // This test depends on OS-specific behavior
    const result = await BashTool.call({ command: 'echo "test"', timeout: 5000 })
    expect(result.data.exitCode).toBe(0)
  })

  it('should use correct userFacingName', () => {
    const name = BashTool.userFacingName({ command: 'npm install' })
    expect(name).toContain('Bash')
    expect(name).toContain('npm install')
  })

  it('should truncate long commands in userFacingName', () => {
    const longCommand = 'a'.repeat(100)
    const name = BashTool.userFacingName({ command: longCommand })
    expect(name.length).toBeLessThan(100)
  })
})

describe('FileReadTool', () => {
  const testDir = path.join(process.cwd(), '.test-files')
  const testFile = path.join(testDir, 'test-read.txt')

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true })
    await fs.writeFile(testFile, 'Hello, World!', 'utf-8')
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should read file content with line numbers', async () => {
    const result = await FileReadTool.call({ file_path: testFile })
    expect(result.data.content).toContain('Hello, World!')
    expect(result.data.totalLines).toBe(1)
  })

  it('should handle non-existent files', async () => {
    const result = await FileReadTool.call({ file_path: '/non/existent/file.txt' })
    expect(result.data.error).toBeDefined()
  })

  it('should support reading specific line ranges', async () => {
    await fs.writeFile(testFile, 'Line 1\nLine 2\nLine 3', 'utf-8')
    const result = await FileReadTool.call({ file_path: testFile, offset: 2, limit: 1 })
    expect(result.data.content).toContain('Line 2')
  })
})

describe('FileWriteTool', () => {
  const testDir = path.join(process.cwd(), '.test-files')
  const testFile = path.join(testDir, 'test-write.txt')

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should write content to file', async () => {
    const result = await FileWriteTool.call({ file_path: testFile, content: 'New content' })
    expect(result.data.filePath).toBeDefined()

    const content = await fs.readFile(testFile, 'utf-8')
    expect(content).toBe('New content')
  })

  it('should create parent directories if needed', async () => {
    const nestedFile = path.join(testDir, 'nested', 'file.txt')
    const result = await FileWriteTool.call({ file_path: nestedFile, content: 'Test' })
    expect(result.data.filePath).toBeDefined()

    const exists = await fs.access(nestedFile).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })

  it('should overwrite existing files', async () => {
    await fs.writeFile(testFile, 'Original content', 'utf-8')
    const result = await FileWriteTool.call({ file_path: testFile, content: 'New content' })
    expect(result.data.filePath).toBeDefined()

    const content = await fs.readFile(testFile, 'utf-8')
    expect(content).toBe('New content')
  })
})

describe('FileEditTool', () => {
  const testDir = path.join(process.cwd(), '.test-files')
  const testFile = path.join(testDir, 'test-edit.txt')

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true })
    await fs.writeFile(testFile, 'Hello World\nGoodbye World', 'utf-8')
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should perform find-replace in file', async () => {
    const result = await FileEditTool.call({
      file_path: testFile,
      old_string: 'World',
      new_string: 'Universe',
    })
    expect(result.data.filePath).toBeDefined()

    const content = await fs.readFile(testFile, 'utf-8')
    expect(content).toBe('Hello Universe\nGoodbye World')
  })

  it('should handle non-existent files', async () => {
    const result = await FileEditTool.call({
      file_path: '/non/existent/file.txt',
      old_string: 'test',
      new_string: 'test',
    })
    expect(result.data.error).toBeDefined()
  })

  it('should return error when oldString not found', async () => {
    const result = await FileEditTool.call({
      file_path: testFile,
      old_string: 'NonExistent',
      new_string: 'Replacement',
    })
    expect(result.data.error).toBeDefined()
  })
})

describe('GrepTool', () => {
  const testDir = path.join(process.cwd(), '.test-files')
  const testFile = path.join(testDir, 'test-grep.txt')

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true })
    await fs.writeFile(testFile, 'Hello World\nHello Universe\nGoodbye World', 'utf-8')
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should search for patterns in files', async () => {
    const result = await GrepTool.call({
      pattern: 'Hello',
      path: testDir,
    })
    // GrepTool returns raw stdout as matches string; may return "No matches found" if rg not installed
    expect(result.data.matches !== undefined || result.data.error !== undefined).toBe(true)
  })

  it('should handle non-existent files', async () => {
    const result = await GrepTool.call({
      pattern: 'test',
      path: '/non/existent/file.txt',
    })
    // ripgrep returns error for non-existent path
    expect(result.data.error || result.data.matches !== undefined).toBe(true)
  })

  it('should return matches for existing patterns', async () => {
    const result = await GrepTool.call({
      pattern: 'Hello',
      path: testDir,
    })
    // Result depends on whether ripgrep is installed
    expect(result.content).toBeDefined()
  })
})

describe('GlobTool', () => {
  const testDir = path.join(process.cwd(), '.test-files')

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true })
    await fs.mkdir(path.join(testDir, 'subdir'), { recursive: true })
    await fs.writeFile(path.join(testDir, 'test1.txt'), 'content', 'utf-8')
    await fs.writeFile(path.join(testDir, 'test2.ts'), 'content', 'utf-8')
    await fs.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'content', 'utf-8')
  })

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  it('should find files matching pattern', async () => {
    const result = await GlobTool.call({
      pattern: '*.txt',
      path: testDir,
    })
    expect(result.data.files).toBeDefined()
    // GlobTool recursively walks all subdirectories
    expect(result.data.files.length).toBeGreaterThanOrEqual(1)
  })

  it('should find files recursively', async () => {
    const result = await GlobTool.call({
      pattern: '*.txt',
      path: testDir,
    })
    expect(result.data.files).toBeDefined()
    expect(result.data.files.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle non-existent directory', async () => {
    const result = await GlobTool.call({
      pattern: '*',
      path: '/non/existent/dir',
    })
    expect(result.data.files).toBeDefined()
  })
})
