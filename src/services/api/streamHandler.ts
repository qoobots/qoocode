import type OpenAI from 'openai'
import type { StreamEvent } from '../../types/message.js'

/**
 * Process a raw OpenAI stream chunk and emit typed StreamEvents.
 * Returns an array of StreamEvents (usually 0-1, but tool_calls can produce multiple).
 */
export function processChunk(
  chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
): StreamEvent[] {
  const events: StreamEvent[] = []
  const choice = chunk.choices?.[0]
  if (!choice) return events

  const { delta } = choice

  // Handle text content
  if (delta.content) {
    events.push({ type: 'text_delta', text: delta.content })
  }

  // Handle tool calls
  if (delta.tool_calls) {
    for (const tc of delta.tool_calls) {
      // Use index as fallback if id is not present
      const toolCallId = tc.id ?? `index_${tc.index}`
      if (tc.function?.name) {
        events.push({
          type: 'tool_call_start',
          toolCallId,
          functionName: tc.function.name,
          index: tc.index,
        })
      }
      if (tc.function?.arguments) {
        events.push({
          type: 'tool_call_delta',
          toolCallId,
          argumentsDelta: tc.function.arguments,
          index: tc.index,
        })
      }
    }
  }

  // Handle finish reason
  if (choice.finish_reason) {
    const usage = chunk.usage
      ? {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        }
      : undefined
    events.push({
      type: 'message_end',
      finishReason: choice.finish_reason,
      usage,
    })
  }

  return events
}

/**
 * Create an async generator that yields StreamEvents from an OpenAI stream.
 */
export async function* streamToEvents(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  model: string,
  signal?: AbortSignal,
): AsyncGenerator<StreamEvent> {
  // Emit message_start
  yield { type: 'message_start', model }

  try {
    let hasMessageEnd = false
    for await (const chunk of stream) {
      if (signal?.aborted) break

      const events = processChunk(chunk)
      for (const event of events) {
        if (event.type === 'message_end') {
          hasMessageEnd = true
        }
        yield event
      }
    }

    // If stream ended without explicit finish_reason, emit synthetic message_end
    if (!hasMessageEnd) {
      yield {
        type: 'message_end',
        finishReason: 'stop',
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      yield { type: 'message_end', finishReason: 'cancelled' }
    } else {
      yield {
        type: 'error',
        error: err instanceof Error ? err : new Error(String(err)),
      }
    }
  }
}
