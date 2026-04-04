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

export function resolveConfig(cliOverrides?: Partial<QooCodeConfig>): QooCodeConfig {
  const fileConfig = loadConfigFile()

  const config: QooCodeConfig = {
    apiKey:
      (cliOverrides?.apiKey as string) ||
      (process.env.OPENAI_API_KEY as string) ||
      (fileConfig.apiKey as string) ||
      '',
    baseUrl:
      (cliOverrides?.baseUrl as string) ||
      (process.env.OPENAI_BASE_URL as string) ||
      (fileConfig.baseUrl as string) ||
      DEFAULT_OPENAI_BASE_URL,
    model:
      (cliOverrides?.model as string) ||
      (process.env.OPENAI_MODEL as string) ||
      (fileConfig.model as string) ||
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

  if (!config.apiKey) {
    console.error('Error: OPENAI_API_KEY is required. Set it via environment variable or config file.')
    console.error(`Config file: ${getConfigFilePath()}`)
    process.exit(1)
  }

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
