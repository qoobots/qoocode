#!/usr/bin/env bun
import React from 'react'
import { render } from 'ink'
import { Command } from '@commander-js/extra-typings'
import { setCwd, getCwd } from './utils/cwd.js'
import { resolveConfig, type QooCodeConfig } from './utils/config.js'
import { launchRepl } from './replLauncher.js'
import { launchReplWindows } from './replLauncherWindows.js'
import { APP_NAME, APP_VERSION } from './constants/defaults.js'

// ============================================================
// CLI Setup
// ============================================================

const program = new Command()
  .name(APP_NAME)
  .description('Open-source AI coding assistant CLI')
  .version(APP_VERSION)
  .argument('[cwd]', 'Working directory', process.cwd())
  .option('-m, --model <model>', 'LLM model name')
  .option('--base-url <url>', 'OpenAI-compatible API base URL')
  .option('-k, --api-key <key>', 'API key')
  .option('--max-tokens <number>', 'Maximum tokens for responses', parseInt)
  .option('-d, --debug', 'Enable debug output', false)
  .option('-v, --verbose', 'Enable verbose output', false)
  .option('-p, --prompt <prompt>', 'Send a prompt and exit (non-interactive mode)')
  .action(async (cwd: string, opts) => {
    // Set working directory
    setCwd(cwd)

    // Resolve configuration
    const config: QooCodeConfig = resolveConfig({
      model: opts.model,
      baseUrl: opts.baseUrl,
      apiKey: opts.apiKey,
      maxTokens: opts.maxTokens,
      debug: opts.debug,
      verbose: opts.verbose,
    })

    if (config.debug) {
      console.error(`[debug] Model: ${config.model}`)
      console.error(`[debug] Base URL: ${config.baseUrl}`)
      console.error(`[debug] CWD: ${getCwd()}`)
    }

    // Non-interactive mode
    if (opts.prompt) {
      const { querySimple } = await import('./query.js')
      const { createUserMessage } = await import('./utils/messages.js')
      const result = await querySimple(config, [createUserMessage(opts.prompt)])
      console.log(result.content)
      process.exit(0)
    }

    // Interactive mode - launch REPL
    // Use Windows-compatible version on Windows to avoid raw mode issues
    if (process.platform === 'win32') {
      launchReplWindows(config)
    } else {
      const replElement = launchRepl(config)
      render(replElement)
    }
  })

// Parse and run
program.parse()
