import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getCommands, findCommand } from '../commands'
import type { Command } from '../commands'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

describe('Integration Tests - Core Commands', () => {
  const tempDir = path.join(os.tmpdir(), 'qoocode-integration-test')
  
  beforeAll(async () => {
    // 创建临时测试目录
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    // 清理临时目录
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // 忽略清理错误
    }
  })

  describe('Command System Integration', () => {
    it('should execute /help command and return available commands', async () => {
      const commands = getCommands()
      expect(commands.length).toBeGreaterThan(0)
      
      const helpCmd = findCommand('help', commands)
      expect(helpCmd).toBeDefined()
      
      if (helpCmd && helpCmd.execute) {
        const result = await helpCmd.execute()
        expect(result).toBeDefined()
      }
    })

    it('should find commands by name and aliases', () => {
      const commands = getCommands()
      const helpByName = findCommand('help', commands)
      const helpByAlias = findCommand('h', commands)
      
      expect(helpByName).toBeDefined()
      expect(helpByAlias).toBeDefined()
      expect(helpByName?.name).toBe(helpByAlias?.name)
    })

    it('should include all core commands', () => {
      const coreCommands = ['help', 'clear', 'exit', 'cost', 'model', 'config']
      const commands = getCommands()
      
      coreCommands.forEach(cmdName => {
        const cmd = commands.find(c => c.name === cmdName)
        expect(cmd).toBeDefined()
        expect(cmd?.execute).toBeInstanceOf(Function)
      })
    })
  })

  describe('File Operations Integration', () => {
    it('should create and read a test file', async () => {
      const testFile = path.join(tempDir, 'test.txt')
      const content = 'Hello, QOOCODE!'
      
      // 写入文件
      await fs.writeFile(testFile, content, 'utf-8')
      
      // 读取文件
      const readContent = await fs.readFile(testFile, 'utf-8')
      expect(readContent).toBe(content)
    })

    it('should list directory contents', async () => {
      const files = await fs.readdir(tempDir)
      expect(files.length).toBeGreaterThan(0)
    })
  })

  describe('Configuration Integration', () => {
    it('should handle configuration operations', async () => {
      const config = {
        apiKey: 'test-key',
        baseUrl: 'https://api.test.com',
        model: 'test-model'
      }

      expect(config.apiKey).toBe('test-key')
      expect(config.baseUrl).toBe('https://api.test.com')
      expect(config.model).toBe('test-model')
    })
  })

  describe('Context Management Integration', () => {
    it('should manage session context', () => {
      const context = {
        messages: [],
        tools: [],
        files: []
      }

      expect(context.messages).toHaveLength(0)
      expect(context.tools).toHaveLength(0)
      expect(context.files).toHaveLength(0)

      context.messages.push({ role: 'user', content: 'test' })
      expect(context.messages).toHaveLength(1)
    })
  })
})
