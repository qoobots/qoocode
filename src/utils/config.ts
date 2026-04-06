import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import {
  DEFAULT_MODEL,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TIMEOUT_MS,
  CONFIG_DIR_NAME,
  CONFIG_FILE_NAME,
} from '../constants/defaults.js'

export type QooCodeConfig = {
  apiKey: string
  baseUrl: string
  model: string
  maxTokens: number
  temperature: number
  timeoutMs: number
  debug: boolean
  verbose: boolean
}

// Type alias for backward compatibility
export type QoocodeConfig = QooCodeConfig

function getConfigDir(): string {
  const home = os.homedir()
  return path.join(home, CONFIG_DIR_NAME)
}

function getConfigFilePath(): string {
  return path.join(getConfigDir(), CONFIG_FILE_NAME)
}

function loadConfigFile(): Record<string, unknown> {
  const configPath = getConfigFilePath()
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8')
      return JSON.parse(content) as Record<string, unknown>
    }
  } catch {
    // Ignore parse errors
  }
  return {}
}

// 清理字符串值中的多余引号（循环清理多层引号）
function cleanStringValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  let cleaned = value.trim()
  // 循环移除首尾的引号
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim()
  }
  return cleaned
}

// 清理环境变量值中的引号
function cleanEnvValue(value: string | undefined): string {
  return cleanStringValue(value)
}

export function resolveConfig(cliOverrides?: Partial<QooCodeConfig>): QooCodeConfig {
  const fileConfig = loadConfigFile()
  const configDir = getConfigDir()

  fs.appendFileSync(
    path.join(configDir, 'qoocode-debug.log'),
    `[${new Date().toISOString()}] === resolveConfig ===\n` +
    `[${new Date().toISOString()}] cliOverrides: ${JSON.stringify(cliOverrides)}\n` +
    `[${new Date().toISOString()}] fileConfig: ${JSON.stringify(fileConfig)}\n` +
    `[${new Date().toISOString()}] OPENAI_API_KEY env: "${process.env.OPENAI_API_KEY}"\n` +
    `[${new Date().toISOString()}] OPENAI_BASE_URL env: "${process.env.OPENAI_BASE_URL}"\n` +
    `[${new Date().toISOString()}] OPENAI_MODEL env: "${process.env.OPENAI_MODEL}"\n`
  )

  const config: QooCodeConfig = {
    apiKey:
      (cliOverrides?.apiKey as string) ||
      cleanEnvValue(process.env.OPENAI_API_KEY) ||
      cleanStringValue(fileConfig.apiKey) ||
      '',
    baseUrl:
      (cliOverrides?.baseUrl as string) ||
      cleanEnvValue(process.env.OPENAI_BASE_URL) ||
      cleanStringValue(fileConfig.baseUrl) ||
      DEFAULT_OPENAI_BASE_URL,
    model:
      (cliOverrides?.model as string) ||
      cleanEnvValue(process.env.OPENAI_MODEL) ||
      cleanStringValue(fileConfig.model) ||
      DEFAULT_MODEL,
    maxTokens:
      (cliOverrides?.maxTokens as number) ||
      (process.env.QOOCODE_MAX_TOKENS ? parseInt(process.env.QOOCODE_MAX_TOKENS, 10) : undefined) ||
      (fileConfig.maxTokens as number) ||
      DEFAULT_MAX_TOKENS,
    temperature: cliOverrides?.temperature ?? DEFAULT_TEMPERATURE,
    timeoutMs: cliOverrides?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    debug: cliOverrides?.debug ?? (process.env.QOOCODE_DEBUG === '1'),
    verbose: cliOverrides?.verbose ?? (process.env.QOOCODE_VERBOSE === '1'),
  }

  fs.appendFileSync(
    path.join(configDir, 'qoocode-debug.log'),
    `[${new Date().toISOString()}] final config: ${JSON.stringify(config)}\n`
  )

  return config
}

export function getConfigDirPath(): string {
  return getConfigDir()
}

export function saveConfig(config: Partial<QooCodeConfig>): void {
  const configDir = getConfigDir()
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
  const configPath = getConfigFilePath()
  const existing = loadConfigFile()
  const merged = { ...existing, ...config }
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8')
}
