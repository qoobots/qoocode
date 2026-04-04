import type { QOOCODEConfig } from './utils/config.js'
import type { Message, AssistantMessage, ToolMessage, StreamEvent, SessionCost } from './types/message.js'
import { createUserMessage, createToolMessage, messagesToOpenAIFormat } from './utils/messages.js'
import { buildSystemPrompt } from './utils/systemPrompt.js'
import { updateSessionCost } from './utils/tokens.js'
import { getTools, type Tools } from './tools.js'
import { findToolByName } from './Tool.js'
import { createStreamChatCompletion } from './services/api/openai-client.js'
import { toolsToOpenAITools } from './services/api/messageAdapter.js'
import { streamToEvents } from './services/api/streamHandler.js'
import { resetClient } from './services/api/openai-client.js'

// ============================================================
// Query Result Types
// ============================================================

export type QueryResult = {
  messages: Message[]
  cost: SessionCost
  abortController: AbortController
}

export type QueryOptions = {
  config: QOOCODEConfig
  messages: Message[]
  cost: SessionCost
  tools?: Tools
  systemPrompt?: string
  signal?: AbortSignal
  onStreamEvent?: (event: StreamEvent) => void
}

// ============================================================
// Main Query Loop
// ============================================================

/**
 * Execute a query: send messages to LLM, handle streaming response,
 * execute tool calls if any, and return the updated conversation.
 */
export async function query(options: QueryOptions): Promise<QueryResult> {
  const {
    config,
    messages: inputMessages,
    cost: inputCost,
    tools: inputTools,
    systemPrompt: inputSystemPrompt,
    signal: externalSignal,
    onStreamEvent,
  } = options

  const abortController = new AbortController()
  const tools = inputTools ?? getTools()
  const systemPrompt = inputSystemPrompt ?? buildSystemPrompt()

  // Link external signal to our abort controller
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => abortController.abort(), { once: true })
  }

  let messages = [...inputMessages]
  let cost = { ...inputCost, entries: [...inputCost.entries] }

  // Main loop: keep going while the model wants to call tools
  const MAX_TOOL_ROUNDS = 20
  let rounds = 0

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++

    // Convert messages to OpenAI format
    const openaiMessages = messagesToOpenAIFormat(messages)
    const openaiTools = toolsToOpenAITools(tools)

    // Create the stream
    let stream
    try {
      stream = await createStreamChatCompletion(config, {
        messages: openaiMessages,
        tools: openaiTools,
        systemPrompt,
      }, abortController.signal)
    } catch (err: unknown) {
      const error = err as Error
      onStreamEvent?.({
        type: 'error',
        error,
      })
      return { messages, cost, abortController }
    }

    // Process the stream and accumulate the assistant response
    const { assistantMessage, usage } = await processStream(
      stream,
      config.model,
      abortController.signal,
      onStreamEvent,
    )

    // Update cost
    if (usage) {
      cost = updateSessionCost(cost, config.model, usage.promptTokens, usage.completionTokens)
    }

    // Add assistant message to conversation
    messages.push(assistantMessage)

    // Check if the model wants to call tools
    if (!assistantMessage.tool_calls?.length) {
      // No tool calls - we're done
      break
    }

    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name
      const tool = findToolByName(tools, toolName)

      if (!tool) {
        // Unknown tool - return error to model
        const toolMsg: ToolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: Unknown tool "${toolName}". Available tools: ${tools.map((t) => t.name).join(', ')}`,
        }
        messages.push(toolMsg)
        continue
      }

      try {
        // Parse tool arguments
        let toolInput: Record<string, unknown>
        try {
          toolInput = JSON.parse(toolCall.function.arguments)
        } catch (parseError: unknown) {
          const error = parseError as Error
          console.error(`Failed to parse tool arguments for "${toolName}": ${error.message}`)
          console.error(`Arguments string: "${toolCall.function.arguments}"`)
          toolInput = {}
        }

        // Check permissions
        const permResult = await tool.checkPermissions(toolInput)
        if (permResult.behavior === 'deny') {
          const toolMsg: ToolMessage = {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Permission denied: ${permResult.message}`,
          }
          messages.push(toolMsg)
          continue
        }

        // Execute the tool
        onStreamEvent?.({
          type: 'tool_call_start',
          toolCallId: toolCall.id,
          functionName: toolName,
        })

        const result = await tool.call(toolInput)

        const toolMsg: ToolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result.content,
        }
        messages.push(toolMsg)
      } catch (err: unknown) {
        const error = err as Error
        const toolMsg: ToolMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error executing tool "${toolName}": ${error.message}`,
        }
        messages.push(toolMsg)
      }
    }
  }

  return { messages, cost, abortController }
}

// ============================================================
// Stream Processing
// ============================================================

/**
 * Process an OpenAI stream and accumulate the assistant message
 */
async function processStream(
  stream: AsyncIterable<any>,
  model: string,
  signal: AbortSignal,
  onStreamEvent?: (event: StreamEvent) => void,
): Promise<{
  assistantMessage: AssistantMessage
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
}> {
  let textContent = ''
  // Use Map with toolCallId as key, but also track by index for matching deltas
  let toolCallsMap = new Map<string, { name: string; arguments: string; index: number }>()
  let finishReason = ''
  let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined

  const eventGenerator = streamToEvents(stream, model, signal)

  for await (const event of eventGenerator) {
    onStreamEvent?.(event)

    switch (event.type) {
      case 'text_delta':
        textContent += event.text
        break
      case 'tool_call_start':
        toolCallsMap.set(event.toolCallId, {
          name: event.functionName,
          arguments: '',
          index: event.index ?? 0,
        })
        break
      case 'tool_call_delta': {
        // Try to find by toolCallId first, then by index
        let existing = toolCallsMap.get(event.toolCallId)
        if (!existing && event.index !== undefined) {
          // Find by index when toolCallId is not available
          for (const tc of toolCallsMap.values()) {
            if (tc.index === event.index) {
              existing = tc
              break
            }
          }
        }
        if (existing) {
          existing.arguments += event.argumentsDelta
        }
        break
      }
      case 'message_end':
        finishReason = event.finishReason
        usage = event.usage
        break
      case 'error':
        throw event.error
    }
  }

  // Build the assistant message
  const toolCalls = Array.from(toolCallsMap.entries()).map(([id, tc]) => ({
    id,
    type: 'function' as const,
    function: { name: tc.name, arguments: tc.arguments },
  }))

  const assistantMessage: AssistantMessage = {
    role: 'assistant',
    content: textContent || '',
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
  }

  return { assistantMessage, usage }
}

/**
 * Send a simple non-streaming message (for commands that need quick responses)
 */
export async function querySimple(
  config: QOOCODEConfig,
  messages: Message[],
  systemPrompt?: string,
): Promise<{ content: string; cost: SessionCost }> {
  const { createChatCompletion } = await import('./services/api/openai-client.js')
  const tools = getTools()
  const sysPrompt = systemPrompt ?? buildSystemPrompt()

  const openaiMessages = messagesToOpenAIFormat(messages)
  const openaiTools = toolsToOpenAITools(tools)

  try {
    const response = await createChatCompletion(config, {
      messages: openaiMessages,
      tools: openaiTools,
      systemPrompt: sysPrompt,
    })

    const content = response.choices[0]?.message?.content ?? ''
    const usage = response.usage

    const cost: SessionCost = {
      totalCostUSD: 0,
      totalTokens: 0,
      entries: [],
    }

    if (usage) {
      return {
        content,
        cost: updateSessionCost(cost, config.model, usage.prompt_tokens, usage.completion_tokens),
      }
    }

    return { content, cost }
  } catch (err: unknown) {
    const error = err as Error
    return { content: `Error: ${error.message}`, cost: { totalCostUSD: 0, totalTokens: 0, entries: [] } }
  }
}
