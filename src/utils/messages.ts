import type { Message, AssistantMessage, ToolMessage, UserMessage } from '../types/message.js'

/**
 * Create a user message
 */
export function createUserMessage(content: string): UserMessage {
  return { role: 'user', content }
}

/**
 * Create a tool result message
 */
export function createToolMessage(toolCallId: string, content: string): ToolMessage {
  return {
    role: 'tool',
    tool_call_id: toolCallId,
    content,
  }
}

/**
 * Convert internal Message[] to OpenAI API format
 */
export function messagesToOpenAIFormat(
  messages: Message[],
): Array<
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | Array<{ type: 'text'; text: string }> }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }
  | { role: 'tool'; tool_call_id: string; content: string }
> {
  return messages.map((msg) => {
    switch (msg.role) {
      case 'system':
        return { role: 'system' as const, content: msg.content }
      case 'user':
        return {
          role: 'user' as const,
          content: typeof msg.content === 'string'
            ? msg.content
            : msg.content.map((p) => ({ type: 'text' as const, text: p.text })),
        }
      case 'assistant': {
        const assistantMsg: {
          role: 'assistant'
          content: string | null
          tool_calls?: Array<{
            id: string
            type: 'function'
            function: { name: string; arguments: string }
          }>
        } = {
          role: 'assistant',
          content: typeof msg.content === 'string'
            ? msg.content
            : msg.content
                ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('') ?? null,
        }
        if (msg.tool_calls) {
          assistantMsg.tool_calls = msg.tool_calls
        }
        return assistantMsg
      }
      case 'tool':
        return { role: 'tool' as const, tool_call_id: msg.tool_call_id, content: msg.content }
    }
  })
}
