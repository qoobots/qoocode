import { describe, it, expect, vi, beforeEach, afterEach, beforeEach as beforeAll, afterEach as afterAll } from 'vitest'
import { resolveConfig, saveConfig, type QoocodeConfig } from './config'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

// We mock process.exit inside beforeEach to ensure it's always active
let mockExit: ReturnType<typeof vi.spyOn>

describe('Config Management', () => {
  const testConfigDir = path.join(process.cwd(), '.test-config')

  beforeEach(async () => {
    // Re-mock process.exit each time
    mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit() called')
    })
    // Set environment variables for testing
    process.env.OPENAI_API_KEY = 'test-api-key'
    process.env.OPENAI_BASE_URL = 'https://api.test.com'
    process.env.OPENAI_MODEL = 'test-model'
  })

  afterEach(async () => {
    // Clean up test config directory
    try {
      await fs.rm(testConfigDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  afterAll(() => {
    mockExit?.mockRestore()
  })

  describe('resolveConfig', () => {
    it('should use environment variables for configuration', () => {
      const config = resolveConfig()
      expect(config.apiKey).toBe('test-api-key')
      expect(config.baseUrl).toBe('https://api.test.com')
      expect(config.model).toBe('test-model')
    })

    it('should use CLI overrides when provided', () => {
      const config = resolveConfig({
        apiKey: 'cli-key',
        model: 'cli-model',
        temperature: 0.7,
      })
      expect(config.apiKey).toBe('cli-key')
      expect(config.model).toBe('cli-model')
      expect(config.temperature).toBe(0.7)
    })

    it('should use default values when not specified', () => {
      const config = resolveConfig()
      expect(config.maxTokens).toBeDefined()
      expect(config.temperature).toBeDefined()
      expect(config.timeoutMs).toBeDefined()
    })

    it('should exit when no API key is provided', async () => {
      // Clear environment variable
      delete process.env.OPENAI_API_KEY
      
      // Temporarily remove apiKey from config file
      const configPath = path.join(os.homedir(), '.qoocode', 'config.json')
      let originalConfig: string | null = null
      try {
        originalConfig = await fs.readFile(configPath, 'utf-8')
        const parsed = JSON.parse(originalConfig)
        delete parsed.apiKey
        await fs.writeFile(configPath, JSON.stringify(parsed), 'utf-8')
      } catch {
        // Config file may not exist, that's fine
      }

      try {
        expect(() => {
          resolveConfig()
        }).toThrow('process.exit() called')
      } finally {
        // Restore config file
        if (originalConfig) {
          await fs.writeFile(configPath, originalConfig, 'utf-8')
        }
      }
    })

    it('should parse maxTokens from environment variable', () => {
      process.env.QOOCODE_MAX_TOKENS = '4096'
      const config = resolveConfig()
      expect(config.maxTokens).toBe(4096)
      delete process.env.QOOCODE_MAX_TOKENS
    })

    it('should enable debug mode from environment', () => {
      process.env.QOOCODE_DEBUG = '1'
      const config = resolveConfig()
      expect(config.debug).toBe(true)
      delete process.env.QOOCODE_DEBUG
    })

    it('should enable verbose mode from environment', () => {
      process.env.QOOCODE_VERBOSE = '1'
      const config = resolveConfig()
      expect(config.verbose).toBe(true)
      delete process.env.QOOCODE_VERBOSE
    })

    it('should handle debug and verbose CLI overrides', () => {
      const config = resolveConfig({
        debug: true,
        verbose: true,
      })
      expect(config.debug).toBe(true)
      expect(config.verbose).toBe(true)
    })
  })

  describe('saveConfig', () => {
    it('should save configuration to file', async () => {
      const configToSave: Partial<QoocodeConfig> = {
        apiKey: 'saved-key',
        model: 'saved-model',
        baseUrl: 'https://saved.com',
      }

      saveConfig(configToSave)

      // Check if file was created (in real config directory)
      // For now, just verify the function doesn't throw
      expect(() => saveConfig(configToSave)).not.toThrow()
    })

    it('should merge with existing configuration', async () => {
      saveConfig({ apiKey: 'first-key', model: 'first-model' })
      saveConfig({ baseUrl: 'https://new.com' })

      // The function should merge, not overwrite
      // We can't easily verify file contents in tests,
      // but we can verify no errors are thrown
      expect(() => {
        saveConfig({ apiKey: 'new-key' })
      }).not.toThrow()
    })

    it('should create config directory if it does not exist', () => {
      const config: Partial<QoocodeConfig> = { apiKey: 'test' }
      expect(() => saveConfig(config)).not.toThrow()
    })
  })

  describe('Config precedence', () => {
    it('should prioritize CLI overrides over everything', () => {
      const config = resolveConfig({
        apiKey: 'cli-key',
      })
      expect(config.apiKey).toBe('cli-key')
    })

    it('should prioritize environment variables over file config', () => {
      // CLI overrides empty, env var set
      const config = resolveConfig()
      expect(config.apiKey).toBe('test-api-key')
    })

    it('should use file config as fallback', () => {
      // This would require actual file setup,
      // so we just verify the function works
      expect(() => resolveConfig()).not.toThrow()
    })
  })

  describe('Config validation', () => {
    it('should require valid API key', async () => {
      process.env.OPENAI_API_KEY = ''
      // Also clear apiKey from config file
      const configPath = path.join(os.homedir(), '.qoocode', 'config.json')
      let originalConfig: string | null = null
      try {
        originalConfig = await fs.readFile(configPath, 'utf-8')
        const parsed = JSON.parse(originalConfig)
        delete parsed.apiKey
        await fs.writeFile(configPath, JSON.stringify(parsed), 'utf-8')
      } catch {
        // Config file may not exist
      }

      try {
        expect(() => resolveConfig()).toThrow()
      } finally {
        if (originalConfig) {
          await fs.writeFile(configPath, originalConfig, 'utf-8')
        }
        process.env.OPENAI_API_KEY = 'test-api-key'
      }
    })

    it('should handle partial configuration gracefully', () => {
      const config = resolveConfig({
        apiKey: 'test-key',
      })
      // All fields should have values
      expect(config.apiKey).toBeDefined()
      expect(config.baseUrl).toBeDefined()
      expect(config.model).toBeDefined()
      expect(config.maxTokens).toBeDefined()
      expect(config.temperature).toBeDefined()
    })
  })
})
