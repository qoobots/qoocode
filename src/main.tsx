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
      const { query } = await import('./query.js')
      const { createUserMessage } = await import('./utils/messages.js')

      // Use query instead of querySimple to support tool calls
      const result = await query({
        config,
        messages: [createUserMessage(opts.prompt)],
        cost: { totalCostUSD: 0, totalTokens: 0, entries: [] },
        onStreamEvent: (event) => {
          // Output streaming events to stdout for visibility
          if (event.type === 'text_delta' && event.text) {
            process.stdout.write(event.text)
          } else if (event.type === 'tool_call_start') {
            process.stdout.write(`\n[执行工具: ${event.functionName}]\n`)
          } else if (event.type === 'error') {
            process.stdout.write(`\n[错误: ${event.error.message}]\n`)
          }
        }
      })

      // Don't output final message again since we already streamed it
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
