# QooCode 打包部署说明

## 概述

QooCode 项目包含两个核心组件，现已集成打包：
1. **qoocode.exe** - 终端 AI 编程助手可执行文件（内嵌在插件中）
2. **jetbrains-plugin** - JetBrains IDE 插件（包含 qoocode.exe）

**重要更新**：qoocode.exe 现在已内嵌到 JetBrains 插件中，用户无需单独安装 qoocode.exe！

## 快速开始

### Windows 系统

```bash
# 一键构建并打包
release.bat
```

### Linux/macOS 系统

```bash
# 给脚本添加执行权限
chmod +x release.sh

# 一键构建并打包
./release.sh
```

## 手动构建步骤

### 1. 构建 qoocode.exe

```bash
# 在项目根目录执行
bun run build:compile

# 生成的文件: qoocode.exe (Windows) 或 qoocode (Linux/macOS)
```

### 2. 复制 qoocode.exe 到插件资源目录

```bash
# Windows
if not exist jetbrains-plugin\src\main\resources\bin mkdir jetbrains-plugin\src\main\resources\bin
copy qoocode.exe jetbrains-plugin\src\main\resources\bin\

# Linux/macOS
mkdir -p jetbrains-plugin/src/main/resources/bin
cp qoocode jetbrains-plugin/src/main/resources/bin/
```

### 3. 构建 JetBrains 插件

```bash
# 进入插件目录
cd jetbrains-plugin

# Windows
.\gradlew.bat buildPlugin

# Linux/macOS
./gradlew buildPlugin

# 生成的文件: build/distributions/jetbrains-plugin-{version}.zip
# 注意：该 ZIP 文件已包含 qoocode.exe
```

### 3. 使用 npm 脚本构建

```bash
# 仅构建 CLI
bun run build:compile

# 仅构建插件
bun run build:plugin

# 构建所有组件
bun run build:all
```

## 版本号同步

### 检查当前版本

```bash
# 查看 package.json 版本
grep '"version"' package.json

# 查看 gradle.properties 版本
grep "pluginVersion=" jetbrains-plugin/gradle.properties
```

### 同步版本号

#### 方法一：使用 release 脚本（推荐）

运行 `release.bat` 或 `release.sh` 时，如果检测到版本不一致，会提示是否同步。

#### 方法二：手动同步

```bash
# 1. 修改 package.json 中的 version 字段
# 2. 修改 jetbrains-plugin/gradle.properties 中的 pluginVersion 字段
# 3. 确保两者一致
```

## 部署方式

### 方式一：一键部署（推荐）

用户只需安装一个插件，qoocode.exe 已内嵌：

1. 打开 IDEA: `File` → `Settings` → `Plugins`
2. 点击 ⚙️ → `Install Plugin from Disk...`
3. 选择 `jetbrains-plugin-{version}.zip`
4. 重启 IDEA

插件会自动使用内嵌的 qoocode.exe，无需额外安装！

### 方式二：开发环境部署

**qoocode.exe（可选，用于独立使用）:**
```bash
# 复制到项目根目录
copy qoocode.exe D:\your\project\qoocode.exe
```

**JetBrains Plugin:**
1. 打开 IDEA: `File` → `Settings` → `Plugins`
2. 点击 ⚙️ → `Install Plugin from Disk...`
3. 选择 `jetbrains-plugin-{version}.zip`
4. 重启 IDEA

### 方式二：系统级部署

**qoocode.exe:**
```bash
# Windows - 安装到用户目录
copy qoocode.exe %LOCALAPPDATA%\qoocode\bin\qoocode.exe

# 添加到系统 PATH（可选）
# 控制面板 → 系统 → 高级系统设置 → 环境变量
```

**JetBrains Plugin:** 上传到 JetBrains Marketplace

### 方式三：便携部署

创建便携包：
```
qoocode-portable/
├── qoocode.exe
├── jetbrains-plugin-{version}.zip
├── config/
│   └── qoocode-config.json
└── README.txt
```

## 发布包结构

构建完成后，生成以下结构：
```
release/qoocode-{version}/
├── jetbrains-plugin-{version}.zip  # JetBrains 插件（已内嵌 qoocode.exe）
├── README.md                       # 项目说明
├── LICENSE                         # 许可证
└── INSTALL.txt                     # 安装说明
```

**重要**：qoocode.exe 已内嵌到 `jetbrains-plugin-{version}.zip` 文件中，无需单独分发。

## 插件查找 qoocode.exe 的顺序

JetBrains 插件会按以下优先级查找 `qoocode.exe`：

1. **插件内嵌**: `bin/qoocode.exe` （优先使用，已内嵌在插件中）
2. **项目根目录**: `{项目路径}/qoocode.exe`
3. **父目录**: `{项目父路径}/qoocode.exe`
4. **用户目录**: `~/.qoocode/bin/qoocode.exe`
5. **系统 AppData**: `%LOCALAPPDATA%\qoocode\bin\qoocode.exe`
6. **系统 PATH**: 通过 PATH 环境变量查找

**注意**：插件优先使用内嵌的 qoocode.exe，无需额外安装！

## 质量检查清单

在发布前，请检查：

- [ ] 版本号一致（package.json 和 gradle.properties）
- [ ] qoocode.exe 功能正常（运行 `qoocode --help`）
- [ ] qoocode.exe 已复制到 `jetbrains-plugin/src/main/resources/bin/`
- [ ] 插件构建成功（`./gradlew verifyPlugin`）
- [ ] 插件 ZIP 包包含 qoocode.exe（解压检查 `bin/qoocode.exe`）
- [ ] 插件和 CLI 兼容性测试
- [ ] 发布包文件完整
- [ ] 安装文档准确

## 故障排查

### qoocode.exe 构建失败

```bash
# 检查 Bun 版本
bun --version  # 需要版本 1.3+

# 清理缓存
bun install

# 重新构建
bun run build:compile
```

### 插件构建失败

```bash
# 检查 Java 版本
java -version  # 需要版本 17+

# 清理构建缓存
cd jetbrains-plugin
./gradlew clean
./gradlew buildPlugin
```

### 插件无法找到 qoocode.exe

1. 检查文件是否在预期位置
2. 查看日志：`Help` → `Show Log in Explorer`
3. 手动指定 qoocode.exe 路径（如果支持）

## 发布到 JetBrains Marketplace

```bash
# 进入插件目录
cd jetbrains-plugin

# 验证插件
./gradlew verifyPlugin

# 发布到 Marketplace（需要配置 token）
./gradlew publishPlugin
```

## 相关文档

- [qoocode CLI 文档](README_CN.md)
- [JetBrains Plugin 文档](jetbrains-plugin/README.md)
- [Terminal 集成说明](jetbrains-plugin/TERMINAL_README.md)

## 支持

- GitHub Issues: https://github.com/qoobots/qoocode/issues
- 文档: https://github.com/qoobots/qoocode
