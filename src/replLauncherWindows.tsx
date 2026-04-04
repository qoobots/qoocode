import React from 'react'
import { render } from 'ink'
import { AppProvider } from './state/AppState.js'
import { WindowsREPL } from './components/REPL/WindowsREPL.js'
import type { QoocodeConfig } from './utils/config.js'

/**
 * Windows 兼容的 REPL 启动器
 * 使用简化的输入处理，避免 raw mode 问题
 */
export function launchReplWindows(config: QoocodeConfig): void {
  const app = (
    <AppProvider config={config}>
      <WindowsREPL />
    </AppProvider>
  )

  render(app)
}