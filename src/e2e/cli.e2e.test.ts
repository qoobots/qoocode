import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '..', '..')

/**
 * 端到端测试：真实 spawn CLI 进程（bun run src/main.tsx），
 * 通过本地 mock 的 OpenAI 兼容服务完成完整链路验证。
 */

interface CliResult {
  code: number | null
  stdout: string
  stderr: string
}

function runCli(args: string[], envOverrides: Record<string, string>, timeoutMs = 90000): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    // Windows 上 bun 通常以 bun.ps1/bun.cmd 形式安装，必须经 shell 才能执行
    const child = spawn('bun', ['run', 'src/main.tsx', ...args], {
      cwd: projectRoot,
      env: envOverrides,
      shell: process.platform === 'win32',
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))

    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`CLI timeout after ${timeoutMs}ms: ${args.join(' ')}`))
    }, timeoutMs)

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout, stderr })
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

type MockRequest = { url: string; body: any; auth: string }

interface MockServer {
  port: number
  requests: MockRequest[]
  close: () => Promise<void>
}

function startMockServer(): Promise<MockServer> {
  const requests: MockRequest[] = []

  const server = http.createServer((req, res) => {
    let data = ''
    req.on('data', (c) => (data += c.toString()))
    req.on('end', () => {
      const auth = (req.headers.authorization as string) ?? ''
      requests.push({ url: req.url ?? '', body: data ? JSON.parse(data) : null, auth })

      // 模拟无效 key
      if (auth.includes('invalid-key')) {
        res.writeHead(401, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            error: {
              message: 'Incorrect API key provided',
              type: 'invalid_request_error',
              code: 'invalid_api_key',
            },
          }),
        )
        return
      }

      // 正常 SSE 流式响应
      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      })

      const chunks = [
        {
          id: 'chatcmpl-e2e',
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: 'mock-model',
          choices: [{ index: 0, delta: { role: 'assistant', content: 'Hello' }, finish_reason: null }],
        },
        {
          id: 'chatcmpl-e2e',
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: 'mock-model',
          choices: [{ index: 0, delta: { content: ' from E2E mock' }, finish_reason: null }],
        },
        {
          id: 'chatcmpl-e2e',
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: 'mock-model',
          choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        },
      ]

      for (const c of chunks) {
        res.write(`data: ${JSON.stringify(c)}\n\n`)
      }
      res.write('data: [DONE]\n\n')
      res.end()
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number }
      resolve({
        port: addr.port,
        requests,
        close: () => new Promise<void>((r) => server.close(() => r())),
      })
    })
  })
}

describe('E2E: CLI end-to-end', () => {
  let server: MockServer
  let tmpDir: string
  let isolatedConfig: string
  let realConfigSnapshot: string | null

  beforeAll(async () => {
    server = await startMockServer()
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qoocode-e2e-'))
    // 指向一个不存在的配置，隔离用户真实配置，避免测试读写 ~/.qoocode
    isolatedConfig = path.join(tmpDir, 'config.json')
    const realConfig = path.join(os.homedir(), '.qoocode', 'config.json')
    realConfigSnapshot = fs.existsSync(realConfig) ? fs.readFileSync(realConfig, 'utf-8') : null
  })

  afterAll(async () => {
    await server.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function baseEnv(): Record<string, string> {
    const env: Record<string, string> = { ...process.env } as Record<string, string>
    delete env.OPENAI_API_KEY
    delete env.OPENAI_BASE_URL
    delete env.OPENAI_MODEL
    env.QOOCODE_CONFIG = isolatedConfig
    return env
  }

  it('--help prints usage and exits 0', async () => {
    const r = await runCli(['--help'], baseEnv())
    expect(r.code).toBe(0)
    expect(r.stdout).toContain('Usage: qoocode')
    expect(r.stdout).toContain('--api-key')
  }, 90000)

  it('--version prints version and exits 0', async () => {
    const r = await runCli(['--version'], baseEnv())
    expect(r.code).toBe(0)
    expect(r.stdout.trim()).toMatch(/\d+\.\d+\.\d+/)
  }, 90000)

  it('exits non-zero with clear message when API key is missing', async () => {
    const r = await runCli(['-p', 'hello'], baseEnv())
    expect(r.code).not.toBe(0)
    const combined = r.stdout + r.stderr
    expect(combined).toContain('OPENAI_API_KEY is required')
  }, 90000)

  it('-p runs a full prompt round-trip against the mock API', async () => {
    const r = await runCli(
      [
        '-p',
        'say hi',
        '-k',
        'test-key',
        '--base-url',
        `http://127.0.0.1:${server.port}/v1`,
        '-m',
        'e2e-test-model',
      ],
      baseEnv(),
    )

    expect(r.code).toBe(0)
    // 流式输出应把模型返回内容写到 stdout
    expect(r.stdout).toContain('Hello')
    expect(r.stdout).toContain('from E2E mock')
  }, 90000)

  it('forwards --model and --base-url to the API endpoint', async () => {
    const before = server.requests.length
    await runCli(
      [
        '-p',
        'check params',
        '-k',
        'test-key',
        '--base-url',
        `http://127.0.0.1:${server.port}/v1`,
        '-m',
        'param-check-model',
      ],
      baseEnv(),
    )

    const newReqs = server.requests.slice(before)
    expect(newReqs.length).toBeGreaterThan(0)
    expect(newReqs[0].body.model).toBe('param-check-model')
    expect(newReqs[0].url).toContain('/chat/completions')
    expect(newReqs[0].body.stream).toBe(true)
  }, 90000)

  it('reports an authentication error when the API rejects the key', async () => {
    const r = await runCli(
      [
        '-p',
        'hello',
        '-k',
        'invalid-key',
        '--base-url',
        `http://127.0.0.1:${server.port}/v1`,
      ],
      baseEnv(),
    )

    const combined = r.stdout + r.stderr
    expect(combined).toMatch(/API Error|authentication|Invalid API key/i)
  }, 90000)

  it('never touches the real user config during the whole E2E run', () => {
    const realConfig = path.join(os.homedir(), '.qoocode', 'config.json')
    if (realConfigSnapshot === null) {
      expect(fs.existsSync(realConfig)).toBe(false)
    } else {
      // 整轮 E2E 跑完后，用户真实配置必须与运行前逐字节一致
      expect(fs.readFileSync(realConfig, 'utf-8')).toBe(realConfigSnapshot)
    }
    // 隔离配置也不应被创建（CLI 正常流程不写配置）
    expect(fs.existsSync(isolatedConfig)).toBe(false)
  })
})
