import OpenAI from 'openai'
import type { QoocodeConfig } from '../utils/config.js'
import { classifyOpenAIError, type APIError } from '../../types/errors.js'

let clientInstance: OpenAI | null = null

export function getOpenAIClient(config: QoocodeConfig): OpenAI {
  if (clientInstance) return clientInstance

  clientInstance = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
    maxRetries: 2,
    defaultHeaders: {
      'User-Agent': `qoocode/0.1.0`,
    },
  })

  return clientInstance
}

export function resetClient(): void {
  clientInstance = null
}

export async function createStreamChatCompletion(
  config: QoocodeConfig,
  params: {
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
    tools?: OpenAI.Chat.ChatCompletionTool[]
    tool_choice?: OpenAI.Chat.ChatCompletionToolChoiceOption
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
  },
  signal?: AbortSignal,
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const client = getOpenAIClient(config)

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt })
  }
  messages.push(...params.messages)

  try {
    const stream = await client.chat.completions.create(
      {
        model: config.model,
        messages,
        tools: params.tools?.length ? params.tools : undefined,
        tool_choice: params.tool_choice,
        max_tokens: params.maxTokens ?? config.maxTokens,
        temperature: params.temperature ?? config.temperature,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal },
    )

    return stream as unknown as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
  } catch (error: unknown) {
    // Classify and re-throw the error with better context
    const apiError = classifyOpenAIError(error)
    console.error(`API Error (${apiError.type}): ${apiError.message}`)
    if (config.debug && apiError.originalError) {
      console.error('Original error:', apiError.originalError)
    }
    throw apiError
  }
}

export async function createChatCompletion(
  config: QoocodeConfig,
  params: {
    messages: OpenAI.Chat.ChatCompletionMessageParam[]
    tools?: OpenAI.Chat.ChatCompletionTool[]
    tool_choice?: OpenAI.Chat.ChatCompletionToolChoiceOption
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
  },
  signal?: AbortSignal,
): Promise<OpenAI.Chat.ChatCompletion> {
  const client = getOpenAIClient(config)

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt })
  }
  messages.push(...params.messages)

  try {
    return await client.chat.completions.create(
      {
        model: config.model,
        messages,
        tools: params.tools?.length ? params.tools : undefined,
        tool_choice: params.tool_choice,
        max_tokens: params.maxTokens ?? config.maxTokens,
        temperature: params.temperature ?? config.temperature,
      },
      { signal },
    )
  } catch (error: unknown) {
    // Classify and re-throw the error with better context
    const apiError = classifyOpenAIError(error)
    console.error(`API Error (${apiError.type}): ${apiError.message}`)
    if (config.debug && apiError.originalError) {
      console.error('Original error:', apiError.originalError)
    }
    throw apiError
  }
}
