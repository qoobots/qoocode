// Default configuration constants for QooCode

export const DEFAULT_MODEL = 'deepseek-chat'

export const DEFAULT_OPENAI_BASE_URL = 'https://api.deepseek.com/v1'

export const DEFAULT_MAX_TOKENS = 8192

export const DEFAULT_TEMPERATURE = 1.0

export const DEFAULT_TIMEOUT_MS = 120_000

// Cost per 1K tokens (approximate, for tracking)
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.00014, output: 0.00028 },
  'deepseek-reasoner': { input: 0.00055, output: 0.00219 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'moonshot-v1-8k': { input: 0.012, output: 0.012 },
  'moonshot-v1-32k': { input: 0.024, output: 0.024 },
  'glm-4': { input: 0.014, output: 0.014 },
  'qwen-turbo': { input: 0.0003, output: 0.0006 },
}

export function getModelCost(model: string): { input: number; output: number } {
  // Try exact match first, then prefix match
  if (MODEL_COSTS[model]) return MODEL_COSTS[model]
  for (const [key, cost] of Object.entries(MODEL_COSTS)) {
    if (model.startsWith(key)) return cost
  }
  return { input: 0.001, output: 0.003 } // default fallback
}

export const APP_NAME = 'qoocode'
export const APP_VERSION = '0.1.0'
export const CONFIG_DIR_NAME = '.QOOCODE'
export const CONFIG_FILE_NAME = 'config.json'
export const HISTORY_FILE_NAME = 'history.json'
