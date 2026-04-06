#!/bin/bash
# QooCode Release Builder
# 构建并打包 qoocode.exe 和 JetBrains 插件 (Linux/macOS)

set -e

echo "========================================"
echo "  QooCode Release Builder"
echo "========================================"
echo ""

# 读取版本号
PACKAGE_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
PLUGIN_VERSION=$(grep "pluginVersion=" jetbrains-plugin/gradle.properties | cut -d'=' -f2)

echo "Current versions:"
echo "  package.json:      $PACKAGE_VERSION"
echo "  gradle.properties: $PLUGIN_VERSION"
echo ""

# 检查版本号是否一致
if [ "$PACKAGE_VERSION" != "$PLUGIN_VERSION" ]; then
    echo "[WARNING] Version mismatch detected!"
    echo "package.json and gradle.properties have different versions."
    echo ""
    read -p "Sync versions? (Y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Syncing plugin version to $PACKAGE_VERSION..."
        sed -i.bak "s/pluginVersion=.*/pluginVersion=$PACKAGE_VERSION/" jetbrains-plugin/gradle.properties
        echo "Plugin version synced to $PACKAGE_VERSION"
    fi
fi

echo ""
echo "========================================"
echo "  Step 1: Building qoocode CLI"
echo "========================================"
bun run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to build qoocode CLI"
    exit 1
fi

if [ ! -f dist/main.js ]; then
    echo "[ERROR] dist/main.js not found after build"
    exit 1
fi

echo "[SUCCESS] qoocode CLI built successfully"
echo ""

echo "========================================"
echo "  Step 2: Copying qoocode to plugin"
echo "========================================"
if [ ! -f qoocode ]; then
    echo "[ERROR] qoocode executable not found after build"
    exit 1
fi

mkdir -p jetbrains-plugin/src/main/resources/bin
cp qoocode jetbrains-plugin/src/main/resources/bin/
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to copy qoocode to plugin"
    exit 1
fi

echo "[SUCCESS] qoocode copied to plugin resources"
echo ""

echo "========================================"
echo "  Step 3: Building JetBrains Plugin"
echo "========================================"
cd jetbrains-plugin
./gradlew buildPlugin
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to build JetBrains plugin"
    cd ..
    exit 1
fi
cd ..

PLUGIN_ZIP="jetbrains-plugin/build/distributions/jetbrains-plugin-$PACKAGE_VERSION.zip"
if [ ! -f "$PLUGIN_ZIP" ]; then
    echo "[ERROR] Plugin ZIP file not found after build"
    exit 1
fi

echo "[SUCCESS] JetBrains plugin built successfully"
echo ""

echo "========================================"
echo "  Step 4: Creating Release Package"
echo "========================================"

# 创建发布目录
RELEASE_DIR="release/qoocode-$PACKAGE_VERSION"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

# 复制文件
# 注意：qoocode CLI 已内嵌在插件中，不再单独复制
cp "$PLUGIN_ZIP" "$RELEASE_DIR/"
cp README.md "$RELEASE_DIR/"
cp LICENSE "$RELEASE_DIR/"

# 创建安装说明
cat > "$RELEASE_DIR/INSTALL.txt" << EOF
QooCode v$PACKAGE_VERSION Release

安装步骤:

1. 安装 JetBrains 插件（qoocode CLI 已内嵌）:
   - 打开 IntelliJ IDEA
   - File > Settings > Plugins
   - 点击齿轮图标 > Install Plugin from Disk...
   - 选择 jetbrains-plugin-$PACKAGE_VERSION.zip
   - 重启 IDE

2. 配置 API 密钥:
   - 打开设置: File > Settings > Tools > QooCode
   - 填写 API Key、Base URL 和 Model
   - 或设置环境变量: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL

3. 开始使用:
   - 按下 Ctrl+Shift+T (或 Cmd+Shift+T) 打开 QooCode 终端
   - 输入命令与 AI 交互

版本信息:
- qoocode CLI: $PACKAGE_VERSION (内嵌在插件中)
- JetBrains Plugin: $PACKAGE_VERSION

支持的 IDE:
- IntelliJ IDEA 2023.1+
- PyCharm 2023.1+
- WebStorm 2023.1+
- 其他 JetBrains IDE 2023.1+

系统要求:
- Linux/macOS
- JetBrains IDE 2023.1 或更高版本
- 网络: 需要访问 OpenAI/DeepSeek 等 API

完整文档: https://github.com/qoobots/qoocode

感谢使用 QooCode!
EOF

echo "[SUCCESS] Release package created: $RELEASE_DIR"
echo ""

echo "========================================"
echo "  Build Summary"
echo "========================================"
echo ""
ls -lh "$RELEASE_DIR"
echo ""

echo "Release package location: $RELEASE_DIR"
echo ""
echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
