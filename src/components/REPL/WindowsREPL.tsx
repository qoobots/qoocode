import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Box, Text, useApp, useInput, Static } from 'ink'
import type { Message, AssistantMessage, StreamEvent } from '../../types/message.js'
import { useAppState } from '../../state/AppState.js'
import { createUserMessage } from '../../utils/messages.js'
import { CollapsibleText } from '../CollapsibleText.js'
import { query } from '../../query.js'
import { getCommands, findCommand } from '../../commands.js'
import { APP_VERSION } from '../../constants/defaults.js'

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

    // 统一的 query 执行（支持 planMode 约束），含流式输出处理
    const runQuery = async (inputText: string, planMode: boolean) => {
      const userMessage = createUserMessage(inputText)
      dispatch({ type: 'ADD_MESSAGE', message: userMessage })
      setIsProcessing(true)
      try {
        let queryError: string | null = null
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
            } else if (event.type === 'error') {
              queryError = event.error.message
            }
          },
          planMode,
        })
        dispatch({ type: 'SET_COST', cost: result.cost })
        dispatch({ type: 'SET_MESSAGES', messages: result.messages })
        if (queryError) {
          dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant' as const, content: `Error: ${queryError}` } })
        }
      } catch (error) {
        const errorMessage: AssistantMessage = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        }
        dispatch({ type: 'ADD_MESSAGE', message: errorMessage })
      } finally {
        setIsProcessing(false)
      }
    }

    // Plan mode 审批分支：空输入 = 批准并实施；/plan = 退出；其他非空 = 修订计划
    if (state.planMode) {
      inputRef.current = ''
      setInput('')
      if (!trimmed) {
        dispatch({ type: 'SET_PLAN_MODE', planMode: false })
        await runQuery('Plan approved. Please begin implementing the plan now.', false)
        return
      }
      if (trimmed.startsWith('/plan')) {
        dispatch({ type: 'SET_PLAN_MODE', planMode: false })
        dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant' as const, content: 'Exited plan mode.' } })
        return
      }
      await runQuery(trimmed, true)
      return
    }

    if (!trimmed) return

    // 检查必需的配置
    const { apiKey, baseUrl, model } = state.config
    if (!apiKey || apiKey.trim() === '' || !baseUrl || baseUrl.trim() === '' || !model || model.trim() === '') {
      const missing: string[] = []
      if (!apiKey || apiKey.trim() === '') missing.push('OPENAI_API_KEY')
      if (!baseUrl || baseUrl.trim() === '') missing.push('OPENAI_BASE_URL')
      if (!model || model.trim() === '') missing.push('OPENAI_MODEL')

      dispatch({
        type: 'ADD_MESSAGE',
        message: {
          role: 'assistant' as const,
          content: `请先配置大模型！\n\n缺少配置: ${missing.join(', ')}\n\n配置方式：\n1. 设置环境变量 OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL\n2. 创建配置文件 ~/.qoocode/config.json\n3. 使用命令 /config 设置\n\n示例 (DeepSeek):\n  OPENAI_API_KEY=your-api-key\n  OPENAI_BASE_URL=https://api.deepseek.com/v1\n  OPENAI_MODEL=deepseek-chat\n\n查看帮助：/help`,
        },
      })
      inputRef.current = ''
      setInput('')
      return
    }

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
        if (typeof result === 'string' && result.startsWith('__ENTER_PLAN_MODE__:')) {
          const taskDesc = result.slice('__ENTER_PLAN_MODE__:'.length)
          if (taskDesc.trim() === '') {
            if (state.planMode) {
              dispatch({ type: 'SET_PLAN_MODE', planMode: false })
              dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant' as const, content: 'Exited plan mode.' } })
            } else {
              dispatch({ type: 'ADD_MESSAGE', message: { role: 'assistant' as const, content: 'Usage: /plan <task-description>\n\nPlan mode helps break down complex tasks. Describe the task, then review and approve the plan (press Enter) before any changes are made.\n\nExample: /plan Create a user authentication system' } })
            }
          } else {
            dispatch({ type: 'SET_PLAN_MODE', planMode: true })
            await runQuery(taskDesc, true)
          }
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

    // 普通消息（planMode = false）
    await runQuery(trimmed, false)
  }, [input, state.config.apiKey, state.config.baseUrl, state.config.model, state.planMode, dispatch, exit])

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
        // 如果是最后一条消息且正在流式输出，追加 streamingText（限制长度避免卡顿）
        const streamingSuffix = state.streamingText && state.streamingText.length > 2000
          ? '...' + state.streamingText.slice(-1997)
          : state.streamingText
        const displayContent = (index === messages.length - 1 && state.streamingText)
          ? content + streamingSuffix
          : content
        return (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Text bold color="green">Assistant:</Text>
            <CollapsibleText text={displayContent} maxLines={30} />
          </Box>
        )
      } else if (msg.role === 'tool') {
        return (
          <Box key={index} flexDirection="column" marginBottom={1}>
            <Text bold color="yellow">Tool:</Text>
            <CollapsibleText text={msg.content} maxLines={20} />
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
      <Box paddingX={1} paddingY={1}>
        <Box flexDirection="column">
          <Text bold color="cyan">QooCode v{APP_VERSION} · AI Coding Assistant</Text>
          <Text color="blue">当前模型: <Text bold color="green">{state.config.model}</Text></Text>
          <Text color="gray">输入消息开始对话，或使用 </Text><Text bold color="green">/help</Text><Text color="gray"> 查看所有命令。</Text>
        </Box>
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