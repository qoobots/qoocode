@echo off
echo ========================================
echo QooCode 插件缓存清理和重建脚本
echo ========================================
echo.

echo [1/4] 停止运行中的 IDE...
echo 请在继续之前关闭所有 JetBrains IDE 实例
pause

echo.
echo [2/4] 清理临时缓存...
if exist "%TEMP%\qoocode-plugin" (
    echo 删除临时目录: %TEMP%\qoocode-plugin
    rmdir /s /q "%TEMP%\qoocode-plugin"
    echo 已删除缓存目录
) else (
    echo 缓存目录不存在，跳过
)

echo.
echo [3/4] 复制 qoocode.exe 到资源目录...
if not exist "jetbrains-plugin\src\main\resources\bin" (
    mkdir "jetbrains-plugin\src\main\resources\bin"
)

if exist "qoocode.exe" (
    copy /Y "qoocode.exe" "jetbrains-plugin\src\main\resources\bin\"
    echo 已复制 qoocode.exe
) else (
    echo 警告: qoocode.exe 不存在于项目根目录
    echo 请先运行: bun run build:compile
    pause
    exit /b 1
)

echo.
echo [4/4] 清理并重新构建插件...
cd jetbrains-plugin
call gradlew.bat clean
call gradlew.bat buildPlugin
cd ..

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 插件文件位于: jetbrains-plugin\build\distributions\
echo 请重新安装插件或重启 IDE（开发模式下）
echo.
