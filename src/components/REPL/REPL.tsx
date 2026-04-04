import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import chalk from 'chalk'
import type { Message, AssistantMessage, StreamEvent } from '../../types/message.js'
import { useAppState } from '../../state/AppState.js'
import { createUserMessage } from '../../utils/messages.js'
import { query } from '../../query.js'
import { getCommands } from '../../commands.js'
import { findCommand } from '../../commands.js'

// ============================================================
// Stream Event Handler Hook
// ============================================================

function useStreamHandler() {
  const { dispatch } = useAppState()

  return useCallback(
    (event: StreamEvent) => {
      switch (event.type) {
        case 'text_delta':
          dispatch({ type: 'APPEND_STREAMING_TEXT', text: event.text })
          break
        case 'tool_call_start':
          dispatch({ type: 'ADD_TOOL_CALL', toolCallId: event.toolCallId, name: event.functionName })
          break
        case 'tool_call_delta':
          dispatch({ type: 'UPDATE_TOOL_CALL_ARGS', toolCallId: event.toolCallId, argsDelta: event.argumentsDelta })
          break
        case 'tool_call_end':
          dispatch({ type: 'REMOVE_TOOL_CALL', toolCallId: event.toolCallId })
          break
        case 'message_end':
          dispatch({ type: 'CLEAR_STREAMING_TEXT' })
          break
        case 'error':
          dispatch({ type: 'SET_ERROR', error: event.error.message })
          break
      }
    },
    [dispatch],
  )
}

// ============================================================
// Message Renderer
// ============================================================

function MessageRenderer({ message }: { message: Message }) {
  if (message.role === 'system') return null

  if (message.role === 'user') {
    const content = typeof message.content === 'string' ? message.content : message.content.map((p) => p.text).join('')
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">
          {'>'} You
        </Text>
        <Text>{content}</Text>
      </Box>
    )
  }

  if (message.role === 'tool') {
    return (
      <Box flexDirection="column" marginBottom={1} paddingLeft={2}>
        <Text dimColor>Tool Result</Text>
        <Text dimColor>{message.content.slice(0, 500)}{message.content.length > 500 ? '...' : ''}</Text>
      </Box>
    )
  }

  if (message.role === 'assistant') {
    const textContent = typeof message.content === 'string'
      ? message.content
      : message.content?.filter((p): p is { type: 'text'; text: string } => p.type === 'text').map((p) => p.text).join('') ?? ''

    const toolCalls = message.tool_calls ?? []

    return (
      <Box flexDirection="column" marginBottom={1}>
        {textContent && (
          <Box flexDirection="column">
            <Text bold color="green">
              {'>'} Assistant
            </Text>
            <Text wrap="wrap">{textContent}</Text>
          </Box>
        )}
        {toolCalls.map((tc) => (
          <Box key={tc.id} flexDirection="column" paddingLeft={2}>
            <Text color="yellow">⚡ {tc.function.name}</Text>
          </Box>
        ))}
      </Box>
    )
  }

  return null
}

// ============================================================
// Streaming Output
// ============================================================

function StreamingOutput() {
  const { state } = useAppState()
  const { streamingText, activeToolCalls } = state

  if (!streamingText && activeToolCalls.size === 0) return null

  return (
    <Box flexDirection="column" marginBottom={1}>
      {streamingText && (
        <Box flexDirection="column">
          <Text bold color="green">{'>'} Assistant</Text>
          <Text wrap="wrap">{streamingText}<Text color="gray">▌</Text></Text>
        </Box>
      )}
      {Array.from(activeToolCalls.entries()).map(([id, tc]) => (
        <Box key={id} flexDirection="column" paddingLeft={2}>
          <Text color="yellow">
            ⚡ {tc.name}
            {tc.arguments && <Text dimColor> {tc.arguments.slice(-80)}</Text>}
            <Text color="gray"> ▌</Text>
          </Text>
        </Box>
      ))}
    </Box>
  )
}

// ============================================================
// Status Bar
// ============================================================

function StatusBar() {
  const { state } = useAppState()
  const { cost, config, isQuerying } = state

  const costStr = cost.totalCostUSD < 0.01
    ? `$${cost.totalCostUSD.toFixed(6)}`
    : `$${cost.totalCostUSD.toFixed(4)}`

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1}>
      <Text dimColor>
        {chalk.gray(config.model)}
        {' | '}
        {chalk.gray(`cost: ${costStr}`)}
        {' | '}
        {chalk.gray(`tokens: ${cost.totalTokens}`)}
        {' | '}
        {isQuerying
          ? chalk.yellow('thinking...')
          : chalk.green('ready')}
      </Text>
    </Box>
  )
}

// ============================================================
// REPL Component
// ============================================================

export function REPL() {
  const { state, dispatch } = useAppState()
  const [input, setInput] = useState('')
  const { exit } = useApp()
  const onStreamEvent = useStreamHandler()
  const inputRef = useRef('')

  // Handle user input submission
  const handleSubmit = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return

      // Check for slash commands
      if (trimmed.startsWith('/')) {
        const cmdName = trimmed.slice(1).split(/\s+/)[0]
        const cmdArgs = trimmed.slice(1 + cmdName.length).trim()
        const commands = getCommands()
        const cmd = findCommand(cmdName, commands)

        if (cmd) {
          if (cmd.type === 'local' && cmd.execute) {
            const result = cmd.execute(cmdArgs)
            if (result === '__CLEAR_MESSAGES__') {
              // Special handling for clear command
              dispatch({ type: 'CLEAR_MESSAGES' })
              dispatch({
                type: 'ADD_MESSAGE',
                message: { role: 'assistant', content: 'Conversation history cleared.' },
              })
            } else if (result === '__EXIT__') {
              // Special handling for exit command
              dispatch({ type: 'ADD_MESSAGE', message: createUserMessage(trimmed) })
              dispatch({
                type: 'ADD_MESSAGE',
                message: { role: 'assistant', content: 'Exiting qoocode...' },
              })
              // Give a small delay for the message to show before exiting
              setTimeout(() => exit(), 100)
            } else if (typeof result === 'string' && result.startsWith('__CHANGE_MODEL__:')) {
              // Special handling for model change command
              const newModel = result.split(':')[1]
              const newConfig = { ...state.config, model: newModel }
              dispatch({ type: 'SET_CONFIG', config: newConfig })
              dispatch({ type: 'ADD_MESSAGE', message: createUserMessage(trimmed) })
              dispatch({
                type: 'ADD_MESSAGE',
                message: { role: 'assistant', content: `Model switched to: ${newModel}\nNote: This will take effect on the next message.` },
              })
            } else if (typeof result === 'string' && result === '__SHOW_COST__') {
              // Special handling for cost command
              const cost = state.cost
              let costMessage = '## Session Cost Summary\n\n'
              
              if (cost.entries.length === 0) {
                costMessage += 'No API usage recorded yet.\n'
              } else {
                costMessage += `**Total Cost**: $${cost.totalCostUSD.toFixed(6)}\n`
                costMessage += `**Total Tokens**: ${cost.totalTokens.toLocaleString()}\n\n`
                costMessage += '**Detailed Breakdown**:\n'
                
                cost.entries.forEach((entry, index) => {
                  costMessage += `\n${index + 1}. **${entry.model}**\n`
                  costMessage += `   - Prompt tokens: ${entry.promptTokens.toLocaleString()}\n`
                  costMessage += `   - Completion tokens: ${entry.completionTokens.toLocaleString()}\n`
                  costMessage += `   - Total tokens: ${entry.totalTokens.toLocaleString()}\n`
                  costMessage += `   - Cost: $${entry.costUSD.toFixed(6)}\n`
                })
              }
              
              dispatch({ type: 'ADD_MESSAGE', message: createUserMessage(trimmed) })
              dispatch({
                type: 'ADD_MESSAGE',
                message: { role: 'assistant', content: costMessage },
              })
            } else if (typeof result === 'string') {
              dispatch({ type: 'ADD_MESSAGE', message: createUserMessage(trimmed) })
              dispatch({
                type: 'ADD_MESSAGE',
                message: { role: 'assistant', content: result },
              })
            }
          }
          setInput('')
          return
        }
      }

      // Add user message
      const userMsg = createUserMessage(trimmed)
      dispatch({ type: 'ADD_MESSAGE', message: userMsg })
      setInput('')

      // Start query
      dispatch({ type: 'SET_QUERYING', isQuerying: true })

      try {
        const result = await query({
          config: state.config,
          messages: [...state.messages, userMsg],
          cost: state.cost,
          signal: undefined,
          onStreamEvent,
        })

        dispatch({ type: 'SET_MESSAGES', messages: result.messages })
        dispatch({ type: 'SET_COST', cost: result.cost })
      } catch (err: unknown) {
        const error = err as Error
        dispatch({ type: 'SET_ERROR', error: error.message })
      } finally {
        dispatch({ type: 'SET_QUERYING', isQuerying: false })
      }
    },
    [state.config, state.messages, state.cost, dispatch, onStreamEvent],
  )

  // Keyboard input
  useInput(
    (char, key) => {
      if (state.isQuerying) return

      if (key.return) {
        handleSubmit(inputRef.current)
        inputRef.current = ''
        setInput('')
        return
      }

      if (key.backspace || key.delete) {
        inputRef.current = inputRef.current.slice(0, -1)
        setInput(inputRef.current)
        return
      }

      if (key.ctrl && char === 'c') {
        exit()
        return
      }

      if (char && !key.ctrl && !key.meta) {
        inputRef.current += char
        setInput(inputRef.current)
      }
    },
    { isActive: true },
  )

  // Display messages
  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box borderStyle="double" borderColor="blue" paddingX={1} marginBottom={1}>
        <Text bold color="blue">
          qoocode v0.1.0
        </Text>
        <Text dimColor>{' '}— AI Coding Assistant ({state.config.model})</Text>
      </Box>

      {/* Welcome */}
      {state.messages.length === 0 && !state.isQuerying && (
        <Box flexDirection="column" marginBottom={1} paddingX={1}>
          <Text color="cyan" bold>Welcome to qoocode!</Text>
          <Text dimColor>Type a message to start, or use /help for commands.</Text>
          <Text dimColor>Press Ctrl+C to exit.</Text>
        </Box>
      )}

      {/* Message list */}
      <Box flexDirection="column" paddingX={1} flexGrow={1}>
        {state.messages.map((msg, i) => (
          <MessageRenderer key={i} message={msg} />
        ))}

        {/* Streaming output */}
        <StreamingOutput />

        {/* Error */}
        {state.error && (
          <Box marginTop={1}>
            <Text color="red">Error: {state.error}</Text>
          </Box>
        )}

        {/* Input */}
        {!state.isQuerying && (
          <Box marginTop={1}>
            <Text bold color="cyan">{'> '}</Text>
            <Text>{input}</Text>
            <Text color="gray">▌</Text>
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <StatusBar />
    </Box>
  )
}
