import React from 'react'
import { AppProvider } from './state/AppState.js'
import { REPL } from './components/REPL/REPL.js'
import type { QoocodeConfig } from './utils/config.js'

export function launchRepl(config: QoocodeConfig): React.ReactElement {
  return (
    <AppProvider config={config}>
      <REPL />
    </AppProvider>
  )
}
