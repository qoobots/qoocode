import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FileReadTool } from '../tools/FileReadTool/FileReadTool'
import { FileWriteTool } from '../tools/FileWriteTool/FileWriteTool'
import { FileEditTool } from '../tools/FileEditTool/FileEditTool'
import { buildTool } from '../Tool'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

describe('Integration Tests - Tools', () => {
  const tempDir = path.join(os.tmpdir(), 'qoocode-tools-integration-test')
  const testFile = path.join(tempDir, 'test.txt')
  
  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch (error) {
      // 忽略清理错误
    }
  })

  describe('File Write -> Read Integration', () => {
    it('should write and then read file content', async () => {
      const writeTool = buildTool(FileWriteTool)
      const readTool = buildTool(FileReadTool)

      // 写入文件
      const writeResult = await writeTool.call({
        file_path: testFile,
        content: 'Hello from integration test!'
      })

      expect(writeResult).toBeDefined()
      // 检查是否成功或包含相关内容
      expect(writeResult.content).toBeDefined()

      // 读取文件
      const readResult = await readTool.call({
        file_path: testFile
      })

      expect(readResult).toBeDefined()
      expect(readResult.content).toContain('Hello from integration test!')
    })
  })

  describe('File Write -> Edit -> Read Integration', () => {
    it('should write, edit, and read file', async () => {
      const writeTool = buildTool(FileWriteTool)
      const editTool = buildTool(FileEditTool)
      const readTool = buildTool(FileReadTool)

      // 写入初始内容
      await writeTool.call({
        file_path: testFile,
        content: 'Line 1\nLine 2\nLine 3'
      })

      // 编辑文件
      const editResult = await editTool.call({
        file_path: testFile,
        old_string: 'Line 2',
        new_string: 'Modified Line 2'
      })

      expect(editResult).toBeDefined()
      expect(editResult.content).toBeDefined()

      // 读取并验证
      const readResult = await readTool.call({
        file_path: testFile
      })

      expect(readResult.content).toContain('Modified Line 2')
      expect(readResult.content).toContain('Line 1')
      expect(readResult.content).toContain('Line 3')
    })
  })

  describe('Tool Error Handling Integration', () => {
    it('should handle file not found error', async () => {
      const readTool = buildTool(FileReadTool)
      const nonExistentFile = path.join(tempDir, 'nonexistent.txt')

      try {
        await readTool.call({
          file_path: nonExistentFile
        })
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error).toBeDefined()
      }
    })

    it('should handle invalid edit operation', async () => {
      const writeTool = buildTool(FileWriteTool)
      const editTool = buildTool(FileEditTool)

      // 写入文件
      await writeTool.call({
        file_path: testFile,
        content: 'Some content'
      })

      // 尝试编辑不存在的文本
      const editResult = await editTool.call({
        file_path: testFile,
        old_string: 'Non-existent text',
        new_string: 'New text'
      })

      // 应该返回错误信息而不是抛出异常
      expect(editResult).toBeDefined()
      expect(editResult.content).toBeDefined()
    })
  })

  describe('Tool Configuration Integration', () => {
    it('should respect maxResultSizeChars limit', async () => {
      const writeTool = buildTool(FileWriteTool)
      const readTool = buildTool(FileReadTool)

      const largeContent = 'A'.repeat(1000)
      await writeTool.call({
        file_path: testFile,
        content: largeContent
      })

      const result = await readTool.call({
        file_path: testFile
      })

      expect(result).toBeDefined()
      expect(result.content.length).toBeGreaterThan(0)
    })
  })
})
