import type { QoocodeConfig } from './utils/config.js'
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
import { getHooksManager } from './services/hooks/hooksService.js'

// Plan mode 系统指令：只读探索 + 产出计划，禁止任何写操作，等待用户审批
const PLAN_MODE_INSTRUCTION = `
You are currently in PLAN MODE. In this mode you must NOT make any changes to the project.

Rules for plan mode:
- You may ONLY use read-only tools to explore the codebase (e.g. Read, Grep, Glob, Git diff/log, LSP lookups, find references). Do NOT use any tool that writes, edits, deletes, moves files, or runs commands that modify system or network state.
- Do NOT modify, create, or delete any files. Do NOT run state-changing commands.
- Explore the codebase as needed to understand the task, then produce a clear, concrete implementation plan.
- Present the plan as a numbered list of steps, naming the specific files/functions to change where possible.
- After presenting the plan, STOP and wait for the user to approve it. Do not call any ExitPlanMode tool; the user approves by pressing Enter.
- If the user gives feedback instead of approving, refine the plan accordingly (still in plan mode).`

// ============================================================
// Query Result Types
// ============================================================

export type QueryResult = {
  messages: Message[]
  cost: SessionCost
  abortController: AbortController
}

export type QueryOptions = {
  config: QoocodeConfig
  messages: Message[]
  cost: SessionCost
  tools?: Tools
  systemPrompt?: string
  signal?: AbortSignal
  onStreamEvent?: (event: StreamEvent) => void
  planMode?: boolean
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
    planMode: inputPlanMode,
  } = options

  const abortController = new AbortController()
  const tools = inputTools ?? getTools()
  const planMode = inputPlanMode ?? false
  let systemPrompt = inputSystemPrompt ?? buildSystemPrompt()
  if (planMode) {
    systemPrompt += '\n\n' + PLAN_MODE_INSTRUCTION
  }

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

    // Execute each tool call — 受控并行：
    // 若本轮所有工具都只读（isReadOnly），则并发执行以提升速度；
    // 否则保持顺序执行，避免并发写文件 / Shell 造成状态冲突。
    const toolCalls = assistantMessage.tool_calls ?? []
    const allReadOnly = toolCalls.every((tc) => {
      const t = findToolByName(tools, tc.function.name)
      if (!t) return true
      try {
        return t.isReadOnly?.(JSON.parse(tc.function.arguments)) ?? false
      } catch {
        return false
      }
    })

    const executeOne = async (
      toolCall: NonNullable<AssistantMessage['tool_calls']>[number],
    ): Promise<void> => {
      const toolName = toolCall.function.name
      const tool = findToolByName(tools, toolName)

      if (!tool) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error: Unknown tool "${toolName}". Available tools: ${tools.map((t) => t.name).join(', ')}`,
        })
        return
      }

      let toolInput: Record<string, unknown>
      try {
        toolInput = JSON.parse(toolCall.function.arguments)
      } catch (parseError: unknown) {
        console.error(`Failed to parse tool arguments for "${toolName}": ${(parseError as Error).message}`)
        toolInput = {}
      }

      const permResult = await tool.checkPermissions(toolInput)
      if (permResult.behavior === 'deny') {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Permission denied: ${permResult.message}`,
        })
        return
      }

      // Plan mode: 禁止任何会修改项目的工具调用（仅允许只读工具）
      if (planMode) {
        const isReadOnly = tool.isReadOnly?.(toolInput) ?? false
        if (!isReadOnly) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: `Plan mode is read-only: "${toolName}" cannot modify the project. Exit plan mode (approve the plan) to make changes.`,
          })
          return
        }
      }

      const preResults = await getHooksManager().executeHooksForEvent('PreToolUse', toolName, {
        tool_name: toolName,
        tool_input: JSON.stringify(toolInput),
      })
      const blocked = preResults.find((r) => !r.result.success)
      if (blocked) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Blocked by PreToolUse hook "${blocked.hook.id}": ${blocked.result.error || 'hook command failed'}`,
        })
        return
      }

      onStreamEvent?.({ type: 'tool_call_start', toolCallId: toolCall.id, functionName: toolName })

      try {
        const result = await tool.call(toolInput)
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: result.content })
        try {
          await getHooksManager().executeHooksForEvent('PostToolUse', toolName, {
            tool_name: toolName,
            tool_input: JSON.stringify(toolInput),
            tool_response: typeof result.content === 'string' ? result.content.slice(0, 2000) : '',
          })
        } catch {
          // hooks 不得破坏主流程
        }
      } catch (err: unknown) {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error executing tool "${toolName}": ${(err as Error).message}`,
        })
      }
    }

    if (allReadOnly && toolCalls.length > 1) {
      await Promise.all(toolCalls.map((tc) => executeOne(tc)))
    } else {
      for (const tc of toolCalls) {
        await executeOne(tc)
      }
    }

    // Stop hooks：每轮所有工具执行完后触发一次
    try {
      await getHooksManager().executeHooksForEvent('Stop')
    } catch {
      // hooks 不得破坏主流程
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
  config: QoocodeConfig,
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
