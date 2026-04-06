# QooCode JetBrains Plugin - Terminal Integration

## 功能特性

### 终端集成模式
现在 JetBrains IDE 插件支持直接集成 qoocode CLI 终端，提供完整的功能体验。

### 可用功能

#### 59+ 个核心工具
- **文件操作**: FileRead, FileWrite, FileEdit, Copy, Move, Delete
- **目录操作**: DirectoryRead, DirectoryWrite, DirectoryEdit
- **搜索**: Grep, Glob, SymbolSearch, FindReferences, GotoDefinition
- **Git**: GitCommit, GitDiff, GitLog, GitBranch
- **终端**: BashTool, PowerShellTool
- **网络**: WebFetch, WebSearch, APICall
- **测试**: RunTests, TestCoverage
- **任务**: TaskCreate, TaskList, TaskGet, TaskUpdate, TaskStop
- **MCP**: MCPTool, McpAuth, ListMcpResources

#### 63+ 个斜杠命令
- `/help` - 显示帮助信息
- `/clear` - 清空对话历史
- `/model` - 切换 AI 模型
- `/plan` - 创建任务计划
- `/session` - 会话管理
- `/commit` - Git commit 辅助
- `/test` - 测试辅助
- `/config` - 配置管理
- `/theme` - 主题切换
- `/compact` - 压缩上下文
- `/doctor` - 诊断检查
- `/upgrade` - 升级检查
- `/memory` - 记忆管理
- `/cache` - 缓存管理
- ... 以及更多命令

## 使用方法

### 1. 启动终端

#### 方式一：通过工具栏
1. 点击菜单栏：`Tools` → `QooCode Terminal`
2. 或使用快捷键：`Ctrl+Shift+T` (Windows/Linux) 或 `Cmd+Shift+T` (Mac)

#### 方式二：通过工具窗口
1. 点击右侧工具栏的 QooCode 图标
2. 自动打开 QooCode 终端面板

### 2. 配置 API 密钥

在首次使用前，需要配置 API 密钥：

1. 打开设置：`File` → `Settings` → `Tools` → `QooCode`
2. 填写以下信息：
   - **API Key**: 你的 OpenAI/DeepSeek 等 API 密钥
   - **Base URL**: API 地址（可选）
   - **Model**: 使用的模型名称（可选）

### 3. 使用示例

在终端中输入命令即可与 AI 交互：

```
qoocode > 分析当前项目结构
qoocode > 帮我创建一个用户登录组件
qoocode > /help
qoocode > /model gpt-4
qoocode > /plan 创建一个待办事项应用
```

### 4. 终端工具栏

终端面板顶部提供以下操作：

- **🔄 重启**: 重新启动 qoocode 进程
- **⏹ 停止**: 停止当前运行的 qoocode
- **⚙ 设置**: 打开配置页面
- **状态指示**: 显示 qoocode 运行状态

## qoocode.exe 位置

插件会在以下位置查找 `qoocode.exe` 可执行文件：

1. 项目根目录：`/path/to/project/qoocode.exe`
2. 父目录：`/path/to/qoocode/qoocode.exe`
3. 用户目录：`~/.qoocode/bin/qoocode.exe`
4. 系统 AppData：`%LOCALAPPDATA%\qoocode\bin\qoocode.exe`
5. 系统 PATH：`qoocode.exe`

## 构建插件

```bash
# 进入插件目录
cd jetbrains-plugin

# 构建插件
./gradlew buildPlugin

# 生成的插件位于：build/distributions/qoocode-*.zip
```

## 安装插件

### 方式一：手动安装
1. 在 IDEA 中：`File` → `Settings` → `Plugins`
2. 点击 ⚙️ 图标 → `Install Plugin from Disk...`
3. 选择 `build/distributions/qoocode-*.zip`
4. 重启 IDEA

### 方式二：开发模式
1. 在 IDEA 中打开 `jetbrains-plugin` 项目
2. 点击 Run 按钮或 `Run` → `Run 'Plugin'`

## 注意事项

1. **依赖**: 需要确保 `qoocode.exe` 可执行文件存在
2. **权限**: 确保 qoocode.exe 有执行权限
3. **网络**: 需要网络连接以访问 AI API
4. **配置**: 首次使用前需要配置 API 密钥

## 故障排查

### 终端无法启动
- 检查 qoocode.exe 是否在正确的位置
- 查看 IDEA 的日志：`Help` → `Show Log in Explorer`

### 命令无响应
- 检查 API 密钥配置是否正确
- 检查网络连接是否正常
- 尝试重启 QooCode 终端

### 功能不可用
- 确保 qoocode CLI 是最新版本
- 查看 `/help` 命令确认可用功能

## 开发模式

如果想调试插件：

1. 在 IDEA 中打开插件项目
2. 设置断点
3. 点击 Debug 按钮运行
4. 在新打开的 IDEA 窗口中测试功能

## 技术实现

- 使用 IntelliJ Platform 的 Terminal API
- 通过 `ProcessBuilder` 启动 qoocode 子进程
- 使用 `JBTerminalWidget` 嵌入终端到工具窗口
- 支持进程监控和自动重启

## 相关链接

- [qoocode CLI 文档](../../README.md)
- [IntelliJ Platform SDK](https://plugins.jetbrains.com/docs/intellij/welcome.html)
- [Terminal API 文档](https://plugins.jetbrains.com/docs/intellij/terminal.html)
