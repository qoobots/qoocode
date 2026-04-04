import React from 'react'
import { AppProvider } from './state/AppState.js'
import { REPL } from './components/REPL/REPL.js'
import type { QOOCODEConfig } from './utils/config.js'

export function launchRepl(config: QOOCODEConfig): React.ReactElement {
  return (
    <AppProvider config={config}>
      <REPL />
    </AppProvider>
  )
}
