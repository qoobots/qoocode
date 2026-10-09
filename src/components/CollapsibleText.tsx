import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

export interface CollapsibleTextProps {
  text: string
  maxLines?: number
  /**
   * 启用交互式展开/折叠。默认 false，避免多个消息组件同时监听输入造成冲突。
   * 当只需要解决卡顿问题时，静态折叠已足够。
   */
  interactive?: boolean
  dimColor?: boolean
  color?: string
}

/**
 * 将长文本按行数折叠显示，避免 Ink/React 渲染超长内容导致终端卡顿。
 */
export function CollapsibleText({ text, maxLines = 30, interactive = false, dimColor, color }: CollapsibleTextProps) {
  const [expanded, setExpanded] = useState(false)
  const lines = text.split('\n')
  const totalLines = lines.length

  if (totalLines <= maxLines || expanded) {
    return (
      <Box flexDirection="column">
        <Text wrap="wrap" dimColor={dimColor} color={color}>{text}</Text>
        {totalLines > maxLines && interactive && (
          <Text color="gray" dimColor>
            ▲ showing all {totalLines} lines (press 'c' to collapse)
          </Text>
        )}
      </Box>
    )
  }

  const visibleText = lines.slice(0, maxLines).join('\n')

  if (interactive) {
    useInput((input) => {
      if (input === 'e' || input === 'E') setExpanded(true)
      if (input === 'c' || input === 'C') setExpanded(false)
    })
  }

  return (
    <Box flexDirection="column">
      <Text wrap="wrap" dimColor={dimColor} color={color}>{visibleText}</Text>
      <Text color="gray" dimColor>
        ... {totalLines - maxLines} more lines folded ({totalLines} total)
      </Text>
    </Box>
  )
}
