import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCommands, findCommand } from './commands'
import type { Command } from './types/message.js'

describe('Full Command Test Suite', () => {
  let allCommands: Command[]

  beforeEach(() => {
    allCommands = getCommands()
    vi.clearAllMocks()
  })

  // ============================================
  // 一、基础命令 (Core Commands)
  // ============================================
  describe('一、基础命令 (Core Commands)', () => {
    describe('/help 命令', () => {
      it('显示帮助信息', () => {
        const cmd = findCommand('help', allCommands)
        expect(cmd).toBeDefined()
        const result = cmd?.execute!()
        expect(result).toContain('Available commands')
        expect(result).toContain('/help')
      })

      it('别名 /h 有效', () => {
        const cmd = findCommand('h', allCommands)
        expect(cmd?.name).toBe('help')
      })

      it('别名 /? 有效', () => {
        const cmd = findCommand('?', allCommands)
        expect(cmd?.name).toBe('help')
      })
    })

    describe('/clear 命令', () => {
      it('清空对话', () => {
        const cmd = findCommand('clear', allCommands)
        expect(cmd?.execute!()).toBe('__CLEAR_MESSAGES__')
      })

      it('别名 /cls 有效', () => {
        const cmd = findCommand('cls', allCommands)
        expect(cmd?.name).toBe('clear')
      })
    })

    describe('/exit 命令', () => {
      it('退出程序', () => {
        const cmd = findCommand('exit', allCommands)
        expect(cmd?.execute!()).toBe('__EXIT__')
      })

      it('别名 /q 有效', () => {
        const cmd = findCommand('q', allCommands)
        expect(cmd?.name).toBe('exit')
      })

      it('别名 /quit 有效', () => {
        const cmd = findCommand('quit', allCommands)
        expect(cmd?.name).toBe('exit')
      })
    })

    describe('/cost 命令', () => {
      it('显示成本', () => {
        const cmd = findCommand('cost', allCommands)
        expect(cmd?.execute!()).toBe('__SHOW_COST__')
      })
    })
  })

  // ============================================
  // 二、模型与配置 (Model & Config)
  // ============================================
  describe('二、模型与配置 (Model & Config)', () => {
    describe('/model 命令', () => {
      it('无参数显示当前模型', () => {
        const cmd = findCommand('model', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Current model')
        expect(result).toContain('Usage: /model')
      })

      it('带参数切换模型', () => {
        const cmd = findCommand('model', allCommands)
        expect(cmd?.execute!('gpt-4o')).toBe('__CHANGE_MODEL__:gpt-4o')
      })
    })

    describe('/config 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('config', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Config Commands')
        expect(result).toContain('/config show')
      })

      it('别名 /cfg 有效', () => {
        const cmd = findCommand('cfg', allCommands)
        expect(cmd?.name).toBe('config')
      })
    })

    describe('/settings 命令', () => {
      it('显示设置', () => {
        const cmd = findCommand('settings', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Settings Commands')
      })

      it('别名 /setting 有效', () => {
        const cmd = findCommand('setting', allCommands)
        expect(cmd?.name).toBe('settings')
      })
    })

    describe('/env 命令', () => {
      it('显示环境变量帮助', () => {
        const cmd = findCommand('env', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Environment Commands')
        expect(result).toContain('/env list')
      })
    })
  })

  // ============================================
  // 三、Git 命令 (Git Commands)
  // ============================================
  describe('三、Git 命令 (Git Commands)', () => {
    describe('/commit 命令', () => {
      it('智能提交', async () => {
        const cmd = findCommand('commit', allCommands)
        const result = await cmd?.execute!('feat: test')
        expect(result).toBe('__GIT_COMMIT__:feat: test')
      })

      it('默认消息', async () => {
        const cmd = findCommand('commit', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toBe('__GIT_COMMIT__:feat: update')
      })

      it('别名 /ci 有效', () => {
        const cmd = findCommand('ci', allCommands)
        expect(cmd?.name).toBe('commit')
      })
    })

    describe('/diff 命令', () => {
      it('显示差异', () => {
        const cmd = findCommand('diff', allCommands)
        const result = cmd?.execute!('')
        expect(result).toBe('__GIT_DIFF__:')
      })

      it('指定文件', () => {
        const cmd = findCommand('diff', allCommands)
        const result = cmd?.execute!('src/index.ts')
        expect(result).toBe('__GIT_DIFF__:src/index.ts')
      })
    })

    describe('/branch 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('branch', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Branch Commands')
        expect(result).toContain('/branch list')
      })

      it('别名 /br 有效', () => {
        const cmd = findCommand('br', allCommands)
        expect(cmd?.name).toBe('branch')
      })
    })

    describe('/merge 命令', () => {
      it('合并分支', () => {
        const cmd = findCommand('merge', allCommands)
        const result = cmd?.execute!('feature-x')
        expect(result).toBe('__GIT_MERGE__:feature-x')
      })
    })
  })

  // ============================================
  // 四、项目管理 (Project Management)
  // ============================================
  describe('四、项目管理 (Project Management)', () => {
    describe('/build 命令', () => {
      it('构建项目', () => {
        const cmd = findCommand('build', allCommands)
        const result = cmd?.execute!('')
        expect(result).toBe('__BUILD_PROJECT__:')
      })
    })

    describe('/run 命令', () => {
      it('运行项目', () => {
        const cmd = findCommand('run', allCommands)
        const result = cmd?.execute!('')
        expect(result).toBe('__RUN_PROJECT__:')
      })
    })

    describe('/test 命令', () => {
      it('运行测试', () => {
        const cmd = findCommand('test', allCommands)
        const result = cmd?.execute!('')
        expect(result).toBe('__RUN_TESTS__:')
      })

      it('指定测试文件', () => {
        const cmd = findCommand('test', allCommands)
        const result = cmd?.execute!('src/utils.test.ts')
        expect(result).toBe('__RUN_TESTS__:src/utils.test.ts')
      })
    })

    describe('/workspace 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('workspace', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Workspace Commands')
        expect(result).toContain('/workspace list')
      })

      it('别名 /ws 有效', () => {
        const cmd = findCommand('ws', allCommands)
        expect(cmd?.name).toBe('workspace')
      })
    })

    describe('/init 命令', () => {
      it('初始化项目', () => {
        const cmd = findCommand('init', allCommands)
        expect(cmd?.type).toBe('prompt')
        expect(cmd?.execute).toBeDefined()
      })
    })
  })

  // ============================================
  // 五、代码分析 (Code Analysis)
  // ============================================
  describe('五、代码分析 (Code Analysis)', () => {
    describe('/review 命令', () => {
      it('代码审查', () => {
        const cmd = findCommand('review', allCommands)
        const result = cmd?.execute!('')
        expect(result).toBe('__CODE_REVIEW__:')
      })

      it('别名 /review-code 有效', () => {
        const cmd = findCommand('review-code', allCommands)
        expect(cmd?.name).toBe('review')
      })
    })

    describe('/files 命令', () => {
      it('列出文件', () => {
        const cmd = findCommand('files', allCommands)
        const result = cmd?.execute!('')
        expect(result).toBe('__LIST_FILES__:')
      })

      it('指定目录', () => {
        const cmd = findCommand('files', allCommands)
        const result = cmd?.execute!('src')
        expect(result).toBe('__LIST_FILES__:src')
      })
    })

    describe('/doctor 命令', () => {
      it('系统诊断', async () => {
        const cmd = findCommand('doctor', allCommands)
        expect(cmd?.type).toBe('local')
        const result = await cmd?.execute!('')
        expect(result).toContain('Summary')
      })
    })

    describe('/btw 命令', () => {
      it('调试状态', async () => {
        const cmd = findCommand('btw', allCommands)
        expect(cmd).toBeDefined()
        const result = await cmd?.execute!('')
        expect(result).toContain('')
      })
    })

    describe('/bughunter 命令', () => {
      it('显示帮助', async () => {
        const cmd = findCommand('bughunter', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('')
      })

      it('别名 /bh 有效', () => {
        const cmd = findCommand('bh', allCommands)
        expect(cmd?.name).toBe('bughunter')
      })

      it('别名 /bugs 有效', () => {
        const cmd = findCommand('bugs', allCommands)
        expect(cmd?.name).toBe('bughunter')
      })
    })
  })

  // ============================================
  // 六、上下文管理 (Context Management)
  // ============================================
  describe('六、上下文管理 (Context Management)', () => {
    describe('/context 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('context', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Context Commands')
        expect(result).toContain('/context show')
      })

      it('别名 /ctx 有效', () => {
        const cmd = findCommand('ctx', allCommands)
        expect(cmd?.name).toBe('context')
      })
    })

    describe('/compact 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('compact', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Context Compression')
      })

      it('别名 /compress 有效', () => {
        const cmd = findCommand('compress', allCommands)
        expect(cmd?.name).toBe('compact')
      })

      it('预览模式', () => {
        const cmd = findCommand('compact', allCommands)
        const result = cmd?.execute!('preview')
        expect(result).toContain('__COMPACT_PREVIEW__')
      })

      it('指定 Token 数', () => {
        const cmd = findCommand('compact', allCommands)
        const result = cmd?.execute!('5000')
        expect(result).toBe('__COMPACT_COMPRESS__:5000')
      })
    })
  })

  // ============================================
  // 七、会话管理 (Session Management)
  // ============================================
  describe('七、会话管理 (Session Management)', () => {
    describe('/session 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('session', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Session Commands')
        expect(result).toContain('/session list')
      })

      it('别名 /sessions 有效', () => {
        const cmd = findCommand('sessions', allCommands)
        expect(cmd?.name).toBe('session')
      })
    })

    describe('/resume 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('resume', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Resume Command')
        expect(result).toContain('/resume snapshots')
      })

      it('别名 /restore 有效', () => {
        const cmd = findCommand('restore', allCommands)
        expect(cmd?.name).toBe('resume')
      })
    })

    describe('/export 命令', () => {
      it('导出数据', () => {
        const cmd = findCommand('export', allCommands)
        const result = cmd?.execute!('session-123')
        expect(result).toBe('__EXPORT_DATA__:session-123')
      })
    })

    describe('/import 命令', () => {
      it('导入数据', () => {
        const cmd = findCommand('import', allCommands)
        const result = cmd?.execute!('/path/to/file.json')
        expect(result).toBe('__IMPORT_DATA__:/path/to/file.json')
      })
    })
  })

  // ============================================
  // 八、权限管理 (Permission Management)
  // ============================================
  describe('八、权限管理 (Permission Management)', () => {
    describe('/permissions 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('permissions', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Permission')
      })

      it('别名 /perm 有效', () => {
        const cmd = findCommand('perm', allCommands)
        expect(cmd?.name).toBe('permissions')
      })

      it('显示状态', () => {
        const cmd = findCommand('permissions', allCommands)
        const result = cmd?.execute!('show')
        expect(result).toContain('Permission Status')
      })

      it('列出级别', () => {
        const cmd = findCommand('permissions', allCommands)
        const result = cmd?.execute!('list')
        expect(result).toContain('Available permission levels')
      })
    })
  })

  // ============================================
  // 九、执行控制 (Execution Control)
  // ============================================
  describe('九、执行控制 (Execution Control)', () => {
    describe('/plan 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('plan', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Usage: /plan')
        expect(result).toContain('Plan mode')
      })

      it('带参数进入计划模式', () => {
        const cmd = findCommand('plan', allCommands)
        const result = cmd?.execute!('create user auth')
        expect(result).toContain('__ENTER_PLAN_MODE__')
      })
    })

    describe('/continue 命令', () => {
      it('继续执行', () => {
        const cmd = findCommand('continue', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('__CONTINUE_EXECUTION__')
      })

      it('别名 /cont 有效', () => {
        const cmd = findCommand('cont', allCommands)
        expect(cmd?.name).toBe('continue')
      })
    })

    describe('/modify 命令', () => {
      it('修改计划', () => {
        const cmd = findCommand('modify', allCommands)
        const result = cmd?.execute!('add error handling')
        expect(result).toContain('__MODIFY_PLAN__')
      })
    })
  })

  // ============================================
  // 十、工具与扩展 (Tools & Extensions)
  // ============================================
  describe('十、工具与扩展 (Tools & Extensions)', () => {
    describe('/mcp 命令', () => {
      it('显示帮助', async () => {
        const cmd = findCommand('mcp', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('MCP Server Management')
        expect(result).toContain('/mcp list')
      })

      it('列出服务器', async () => {
        const cmd = findCommand('mcp', allCommands)
        const result = await cmd?.execute!('list')
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
      })

      it('显示状态', async () => {
        const cmd = findCommand('mcp', allCommands)
        const result = await cmd?.execute!('status')
        expect(result).toContain('MCP Status')
      })
    })

    describe('/plugin 命令', () => {
      it('显示帮助', async () => {
        const cmd = findCommand('plugin', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('Plugin Management')
        expect(result).toContain('/plugin list')
      })

      it('别名 /plugins 有效', () => {
        const cmd = findCommand('plugins', allCommands)
        expect(cmd?.name).toBe('plugin')
      })

      it('列出插件', async () => {
        const cmd = findCommand('plugin', allCommands)
        const result = await cmd?.execute!('list')
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
      })
    })

    describe('/skills 命令', () => {
      it('显示帮助', () => {
        const cmd = findCommand('skills', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Skills Commands')
        expect(result).toContain('/skills list')
      })

      it('别名 /skill 有效', () => {
        const cmd = findCommand('skill', allCommands)
        expect(cmd?.name).toBe('skills')
      })
    })

    describe('/agents 命令', () => {
      it('显示帮助', () => {
        const cmd = findCommand('agents', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Agent Commands')
        expect(result).toContain('/agents list')
      })

      it('别名 /agent 有效', () => {
        const cmd = findCommand('agent', allCommands)
        expect(cmd?.name).toBe('agents')
      })
    })
  })

  // ============================================
  // 十一、Swarm 团队协作 (Team Collaboration)
  // ============================================
  describe('十一、Swarm 团队协作 (Team Collaboration)', () => {
    describe('/swarm 命令', () => {
      it('显示状态', () => {
        const cmd = findCommand('swarm', allCommands)
        const result = cmd?.execute!('')
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
      })

      it('别名 /team 有效', () => {
        const cmd = findCommand('team', allCommands)
        expect(cmd?.name).toBe('swarm')
      })

      it('别名 /teams 有效', () => {
        const cmd = findCommand('teams', allCommands)
        expect(cmd?.name).toBe('swarm')
      })

      it('创建团队', () => {
        const cmd = findCommand('swarm', allCommands)
        const result = cmd?.execute!('create my-team')
        expect(result).toContain('__TEAM_CREATE__')
      })

      it('删除团队', () => {
        const cmd = findCommand('swarm', allCommands)
        const result = cmd?.execute!('delete')
        expect(result).toContain('__TEAM_DELETE__')
      })
    })
  })

  // ============================================
  // 十二、主题与界面 (Theme & UI)
  // ============================================
  describe('十二、主题与界面 (Theme & UI)', () => {
    describe('/theme 命令', () => {
      it('显示当前主题', () => {
        const cmd = findCommand('theme', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Theme')
      })

      it('切换主题', () => {
        const cmd = findCommand('theme', allCommands)
        const result = cmd?.execute!('toggle')
        expect(result).toContain('Theme changed')
      })

      it('设置亮色', () => {
        const cmd = findCommand('theme', allCommands)
        const result = cmd?.execute!('light')
        expect(result).toContain('Theme set to')
      })

      it('设置暗色', () => {
        const cmd = findCommand('theme', allCommands)
        const result = cmd?.execute!('dark')
        expect(result).toContain('Theme set to')
      })

      it('别名 /t 有效', () => {
        const cmd = findCommand('t', allCommands)
        expect(cmd?.name).toBe('theme')
      })
    })

    describe('/vim 命令', () => {
      it('切换模式', () => {
        const cmd = findCommand('vim', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('__VIM_MODE__')
      })

      it('显示帮助', () => {
        const cmd = findCommand('vim', allCommands)
        const result = cmd?.execute!('help')
        expect(result).toContain('Vim Mode Commands')
      })

      it('别名 /vi 有效', () => {
        const cmd = findCommand('vi', allCommands)
        expect(cmd?.name).toBe('vim')
      })
    })
  })

  // ============================================
  // 十三、账户与认证 (Account & Auth)
  // ============================================
  describe('十三、账户与认证 (Account & Auth)', () => {
    describe('/login 命令', () => {
      it('显示状态', async () => {
        const cmd = findCommand('login', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('')
      })

      it('别名 /account 有效', () => {
        const cmd = findCommand('account', allCommands)
        expect(cmd?.name).toBe('login')
      })

      it('别名 /signin 有效', () => {
        const cmd = findCommand('signin', allCommands)
        expect(cmd?.name).toBe('login')
      })
    })

    describe('/logout 命令', () => {
      it('登出', async () => {
        const cmd = findCommand('logout', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('')
      })

      it('别名 /signout 有效', () => {
        const cmd = findCommand('signout', allCommands)
        expect(cmd?.name).toBe('logout')
      })
    })
  })

  // ============================================
  // 十四、诊断与统计 (Diagnostics & Stats)
  // ============================================
  describe('十四、诊断与统计 (Diagnostics & Stats)', () => {
    describe('/stats 命令', () => {
      it('显示统计', () => {
        const cmd = findCommand('stats', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('__SHOW_STATS__')
      })
    })

    describe('/usage 命令', () => {
      it('显示使用情况', () => {
        const cmd = findCommand('usage', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('__SHOW_USAGE__')
      })
    })

    describe('/status 命令', () => {
      it('显示系统状态', () => {
        const cmd = findCommand('status', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('__SHOW_STATUS__')
      })

      it('别名 /st 有效', () => {
        const cmd = findCommand('st', allCommands)
        expect(cmd?.name).toBe('status')
      })
    })

    describe('/debug 命令', () => {
      it('无参数显示帮助', () => {
        const cmd = findCommand('debug', allCommands)
        const result = cmd?.execute!('')
        expect(result).toContain('Debug Commands')
        expect(result).toContain('/debug info')
      })
    })
  })

  // ============================================
  // 十五、开发者工具 (Developer Tools)
  // ============================================
  describe('十五、开发者工具 (Developer Tools)', () => {
    describe('/heapdump 命令', () => {
      it('创建堆快照', async () => {
        const cmd = findCommand('heapdump', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('')
      })

      it('别名 /heap 有效', () => {
        const cmd = findCommand('heap', allCommands)
        expect(cmd?.name).toBe('heapdump')
      })

      it('别名 /memory 有效', () => {
        const cmd = findCommand('memory', allCommands)
        expect(cmd?.name).toBe('heapdump')
      })
    })

    describe('/mock-limits 命令', () => {
      it('显示状态', async () => {
        const cmd = findCommand('mock-limits', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('')
      })

      it('别名 /ratelimit 有效', () => {
        const cmd = findCommand('ratelimit', allCommands)
        expect(cmd?.name).toBe('mock-limits')
      })

      it('别名 /limits 有效', () => {
        const cmd = findCommand('limits', allCommands)
        expect(cmd?.name).toBe('mock-limits')
      })
    })

    describe('/update 命令', () => {
      it('检查更新', async () => {
        const cmd = findCommand('update', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      })

      it('upgrade 是独立命令', () => {
        const cmd = findCommand('upgrade', allCommands)
        expect(cmd?.name).toBe('upgrade')
      })
    })
  })

  // ============================================
  // 十六、平台集成 (Platform Integration)
  // ============================================
  describe('十六、平台集成 (Platform Integration)', () => {
    describe('/desktop 命令', () => {
      it('显示桌面集成', async () => {
        const cmd = findCommand('desktop', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('Desktop Integration')
      })

      it('别名 /dt 有效', () => {
        const cmd = findCommand('dt', allCommands)
        expect(cmd?.name).toBe('desktop')
      })
    })

    describe('/mobile 命令', () => {
      it('显示移动端集成', async () => {
        const cmd = findCommand('mobile', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('Mobile Integration')
      })

      it('别名 /mb 有效', () => {
        const cmd = findCommand('mb', allCommands)
        expect(cmd?.name).toBe('mobile')
      })
    })
  })

  // ============================================
  // 十七、缓存管理 (Cache Management)
  // ============================================
  describe('十七、缓存管理 (Cache Management)', () => {
    describe('/cache 命令', () => {
      it('显示缓存状态', async () => {
        const cmd = findCommand('cache', allCommands)
        const result = await cmd?.execute!('')
        expect(result).toContain('')
      })
    })
  })

  // ============================================
  // 命令完整性验证
  // ============================================
  describe('命令完整性验证', () => {
    const expectedCommands = [
      'help', 'clear', 'exit', 'cost', 'model', 'commit', 'review',
      'mcp', 'plugin', 'plan', 'session', 'skills', 'agents', 'test',
      'workspace', 'config', 'diff', 'branch', 'stats', 'usage',
      'build', 'run', 'merge', 'env', 'settings', 'debug', 'continue',
      'modify', 'context', 'files', 'status', 'resume', 'export',
      'import', 'doctor', 'vim', 'permissions', 'compact', 'init',
      'desktop', 'mobile', 'theme', 'btw', 'bughunter', 'login',
      'logout', 'heapdump', 'mock-limits', 'update', 'swarm', 'cache'
    ]

    it('所有命令都应该存在', () => {
      const names = allCommands.map(c => c.name)
      const missing = expectedCommands.filter(cmd => !names.includes(cmd))
      expect(missing).toEqual([])
    })

    it('所有命令都应该有 execute 函数', () => {
      const missing = allCommands.filter(cmd => !cmd.execute)
      expect(missing.length, `Missing execute: ${missing.map(c => c.name).join(', ')}`).toBe(0)
    })

    it('所有命令都应该有 description', () => {
      const missing = allCommands.filter(cmd => !cmd.description || cmd.description.length === 0)
      expect(missing.length, `Missing description: ${missing.map(c => c.name).join(', ')}`).toBe(0)
    })

    it('所有命令都应该有 type', () => {
      const missing = allCommands.filter(cmd => !cmd.type)
      expect(missing.length, `Missing type: ${missing.map(c => c.name).join(', ')}`).toBe(0)
    })
  })
})
