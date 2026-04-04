import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Text, useApp, useInput } from 'ink'
import type { Message, AssistantMessage, StreamEvent } from '../../types/message.js'
import { useAppState } from '../../state/AppState.js'
import { createUserMessage } from '../../utils/messages.js'
import { query } from '../../query.js'
import { getCommands, findCommand } from '../../commands.js'

// Windows 兼容的 REPL 组件 - 使用 ref 存储输入缓冲区
export function WindowsREPL(): React.ReactElement {
  const { exit } = useApp()
  const { state, dispatch } = useAppState()
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef('')

  // 处理输入
  const handleSubmit = useCallback(async () => {
    const trimmed = inputRef.current.trim()
    if (!trimmed) return

    inputRef.current = ''
    setInput('')
    
    // 检查是否是命令
    if (trimmed.startsWith('/')) {
      const cmdName = trimmed.slice(1).split(/\s+/)[0]
      const cmdArgs = trimmed.slice(1 + cmdName.length).trim()
      const commands = getCommands()
      const command = findCommand(cmdName, commands)

      if (command) {
        const result = command.execute?.(cmdArgs)
        // 处理特殊命令返回值
        if (result === '__EXIT__') {
          exit()
          return
        }
        // 对于其他返回值，如果是字符串则显示
        if (typeof result === 'string' && result !== '__CLEAR_MESSAGES__') {
          dispatch({
            type: 'ADD_MESSAGE',
            message: { role: 'assistant' as const, content: result },
          })
        }
        return
      }
    }

    // 用户消息
    const userMessage = createUserMessage(trimmed)
    dispatch({ type: 'ADD_MESSAGE', message: userMessage })
    setIsProcessing(true)

    try {
      const result = await query({
        config: state.config,
        messages: [...state.messages, userMessage],
        cost: state.cost,
        onStreamEvent: (event: StreamEvent) => {
          if (event.type === 'text_delta') {
            dispatch({ type: 'APPEND_STREAMING_TEXT', text: event.text })
          } else if (event.type === 'message_end') {
            dispatch({ type: 'CLEAR_STREAMING_TEXT' })
          } else if (event.type === 'tool_call_start') {
            dispatch({ type: 'ADD_TOOL_CALL', toolCallId: event.toolCallId, name: event.functionName })
          } else if (event.type === 'tool_call_end') {
            dispatch({ type: 'REMOVE_TOOL_CALL', toolCallId: event.toolCallId })
          }
        },
      })

      dispatch({ type: 'SET_COST', cost: result.cost })
      dispatch({ type: 'SET_MESSAGES', messages: result.messages })
    } catch (error) {
      const errorMessage: AssistantMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      }
      dispatch({ type: 'ADD_MESSAGE', message: errorMessage })
    } finally {
      setIsProcessing(false)
    }
  }, [input, state, dispatch, exit])

  // 简单的键盘处理（使用 ref 避免状态更新延迟）
  useInput((inputChar, key) => {
    if (isProcessing) return

    // 处理回车
    if (key.return) {
      handleSubmit()
      return
    }

    // 处理退格和删除
    if (key.backspace || key.delete) {
      inputRef.current = inputRef.current.slice(0, -1)
      setInput(inputRef.current)
      return
    }

    // 处理 Ctrl+C / Ctrl+D
    if (key.ctrl && (inputChar === 'c' || inputChar === 'd')) {
      exit()
      return
    }

    // 处理 Escape
    if (key.escape) {
      exit()
      return
    }

    // 处理普通字符输入（包括中文等多字节字符）
    // 注意：输入法可能会分多次发送字符，需要累积
    if (inputChar && !key.ctrl && !key.meta && !key.escape && !key.tab && !key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow) {
      // 直接追加到输入缓冲区
      inputRef.current += inputChar
      setInput(inputRef.current)
    }
  }, { isActive: true })

  // 渲染消息
  const renderMessages = () => {
    const messages = [...state.messages]

    // 如果正在流式输出，在最后一条助手消息后追加 streamingText
    if (state.streamingText) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.role === 'assistant') {
        // streamingText 已经在消息中，不需要额外处理
      } else {
        // 没有现有消息，创建一个占位
        messages.push({
          role: 'assistant' as const,
          content: '',
        })
      }
    }

    return messages.map((msg, index) => {
      if (msg.role === 'user') {
        const content = typeof msg.content === 'string' ? msg.content : msg.content.map(p => p.text).join('')
        return (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Text bold color="cyan">You:</Text>
            <Text>{content}</Text>
          </Box>
        )
      } else if (msg.role === 'assistant') {
        const content = typeof msg.content === 'string' ? msg.content : msg.content.filter(p => p.type === 'text').map(p => p.text).join('')
        // 如果是最后一条消息且正在流式输出，追加 streamingText
        const displayContent = (index === messages.length - 1 && state.streamingText)
          ? content + state.streamingText
          : content
        return (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Text bold color="green">Assistant:</Text>
            <Text>{displayContent}</Text>
          </Box>
        )
      } else if (msg.role === 'tool') {
        return (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Text bold color="yellow">Tool:</Text>
            <Text>{msg.content}</Text>
          </Box>
        )
      }
      return null
    })
  }

  // 渲染状态栏
  const renderStatusBar = () => {
    const model = state.config.model
    const cost = state.cost?.totalCostUSD?.toFixed(6) ?? '0.000000'
    const tokens = state.cost?.totalTokens ?? 0
    const status = isProcessing ? 'processing...' : 'ready'

    return (
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text>
          {model} | cost: ${cost} | tokens: {tokens} | {status}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* 标题 */}
      <Box borderStyle="double" borderColor="blue" paddingX={2}>
        <Text bold>QOOCODE v0.1.0 — AI Coding Assistant ({state.config.model})</Text>
      </Box>

      <Box padding={1}>
        <Text>Welcome to QOOCODE! Type a message to start, or use /help for commands.</Text>
      </Box>

      {/* 消息区域 */}
      <Box flexDirection="column" paddingX={1}>
        {renderMessages()}
      </Box>

      {/* 输入区域 */}
      {!isProcessing && (
        <Box marginTop={1}>
          <Text><Text bold color="cyan">{'> '}</Text><Text>{input}</Text><Text color="gray">▌</Text></Text>
        </Box>
      )}

      {/* 状态栏 */}
      <Box marginTop={1}>
        {renderStatusBar()}
      </Box>
    </Box>
  )
}