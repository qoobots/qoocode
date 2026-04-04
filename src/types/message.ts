import type { z } from 'zod'

// ============================================================
// Message Types (OpenAI-compatible internal format)
// ============================================================

export type TextContentPart = { type: 'text'; text: string }

export type ToolCallContentPart = {
  type: 'tool_call'
  id: string
  function: { name: string; arguments: string }
}

export type AssistantContent = TextContentPart | ToolCallContentPart

export type ToolResultContentPart = {
  type: 'tool_result'
  tool_call_id: string
  content: string
}

export type UserMessage = {
  role: 'user'
  content: string | TextContentPart[]
}

export type AssistantMessage = {
  role: 'assistant'
  content: string | AssistantContent[]
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

export type ToolMessage = {
  role: 'tool'
  tool_call_id: string
  content: string
}

export type SystemMessage = {
  role: 'system'
  content: string
}

export type Message = UserMessage | AssistantMessage | ToolMessage | SystemMessage

// ============================================================
// Stream Event Types
// ============================================================

export type StreamEventType =
  | 'text_delta'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_call_end'
  | 'message_start'
  | 'message_end'
  | 'error'

export type StreamEvent =
  | { type: 'text_delta'; text: string }
  | {
      type: 'tool_call_start'
      toolCallId: string
      functionName: string
      index?: number
    }
  | {
      type: 'tool_call_delta'
      toolCallId: string
      argumentsDelta: string
      index?: number
    }
  | {
      type: 'tool_call_end'
      toolCallId: string
    }
  | {
      type: 'message_start'
      model: string
    }
  | {
      type: 'message_end'
      finishReason: string
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
    }
  | {
      type: 'error'
      error: Error
    }

// ============================================================
// Command Types
// ============================================================

export type Command = {
  name: string
  aliases?: string[]
  description: string
  type: 'local' | 'prompt'
  execute?: (args: string) => string | void
  getPrompt?: (args: string) => Promise<string>
}

// ============================================================
// Permission Types (simplified)
// ============================================================

export type PermissionResult =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown> }
  | { behavior: 'deny'; message: string }
  | { behavior: 'ask'; message: string }

// ============================================================
// Cost Tracking
// ============================================================

export type CostEntry = {
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUSD: number
  timestamp: number
}

export type SessionCost = {
  totalCostUSD: number
  totalTokens: number
  entries: CostEntry[]
}

