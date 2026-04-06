@echo off
REM QooCode Release Builder
REM Build and package qoocode.exe and JetBrains plugin

setlocal enabledelayedexpansion

echo ========================================
echo   QooCode Release Builder
echo ========================================
echo.

REM Read version numbers
for /f "tokens=*" %%i in ('powershell -Command "$content = Get-Content package.json -Raw; $json = ConvertFrom-Json $content; $json.version"') do set PACKAGE_VERSION=%%i
for /f "tokens=2 delims==" %%i in ('findstr "pluginVersion" jetbrains-plugin\gradle.properties') do set PLUGIN_VERSION=%%i
set PLUGIN_VERSION=%PLUGIN_VERSION: =%

echo Current versions:
echo   package.json:      %PACKAGE_VERSION%
echo   gradle.properties: %PLUGIN_VERSION%
echo.

REM Check if versions match
if not "%PACKAGE_VERSION%"=="%PLUGIN_VERSION%" (
    echo [WARNING] Version mismatch detected!
    echo package.json and gradle.properties have different versions.
    echo.
    set /p SYNC="Sync versions? (Y/N): "
    if /i "!SYNC!"=="Y" (
        echo Syncing plugin version to %PACKAGE_VERSION%...
        set "TEMP_VERSION=%PACKAGE_VERSION%"
        powershell -Command "(Get-Content jetbrains-plugin\gradle.properties) -replace 'pluginVersion=.*', ('pluginVersion=' + $env:TEMP_VERSION) | Set-Content jetbrains-plugin\gradle.properties"
        set PLUGIN_VERSION=%PACKAGE_VERSION%
        echo Plugin version synced to %PACKAGE_VERSION%
    )
)

echo.
echo ========================================
echo   Step 1: Building qoocode.exe
echo ========================================
call bun run build:compile
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build qoocode.exe
    exit /b 1
)

if not exist qoocode.exe (
    echo [ERROR] qoocode.exe not found after build
    exit /b 1
)

echo [SUCCESS] qoocode.exe built successfully
echo.

echo ========================================
echo   Step 2: Copying qoocode.exe to plugin
echo ========================================
echo Target directory: jetbrains-plugin\src\main\resources\bin

echo Creating directory and copying qoocode.exe...
if not exist "jetbrains-plugin\src\main\resources\bin" mkdir "jetbrains-plugin\src\main\resources\bin"
copy /Y "qoocode.exe" "jetbrains-plugin\src\main\resources\bin\"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to copy qoocode.exe to plugin
    echo Error code: %errorlevel%
    exit /b 1
)

echo [SUCCESS] qoocode.exe copied to plugin resources

if not exist "jetbrains-plugin\src\main\resources\bin\qoocode.exe" (
    echo [ERROR] Verification failed: qoocode.exe not found in plugin resources
    exit /b 1
)

echo [SUCCESS] Verification passed: qoocode.exe found in plugin resources
echo.

echo ========================================
echo   Step 3: Building JetBrains Plugin
echo ========================================
cd jetbrains-plugin
call gradlew.bat buildPlugin
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build JetBrains plugin
    cd ..
    exit /b 1
)
cd ..

if not exist jetbrains-plugin\build\distributions\jetbrains-plugin-%PACKAGE_VERSION%.zip (
    echo [ERROR] Plugin ZIP file not found after build
    exit /b 1
)

echo [SUCCESS] JetBrains plugin built successfully
echo.

echo ========================================
echo   Step 4: Creating Release Package
echo ========================================

REM Create release directory
set RELEASE_DIR=release\qoocode-%PACKAGE_VERSION%
if exist "%RELEASE_DIR%" rmdir /s /q "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%"

REM Copy files
REM Note: qoocode.exe is bundled in the plugin, no need to copy separately
copy jetbrains-plugin\build\distributions\jetbrains-plugin-%PACKAGE_VERSION%.zip "%RELEASE_DIR%\" >nul
copy README.md "%RELEASE_DIR%\" >nul
copy LICENSE "%RELEASE_DIR%\" >nul

REM Create installation instructions
(
echo QooCode v%PACKAGE_VERSION% Release
echo.
echo Installation Steps:
echo.
echo 1. Install JetBrains Plugin (qoocode.exe is bundled):
echo    - Open IntelliJ IDEA
echo    - File ^> Settings ^> Plugins
echo    - Click gear icon ^> Install Plugin from Disk...
echo    - Select jetbrains-plugin-%PACKAGE_VERSION%.zip
echo    - Restart IDE
echo.
echo 2. Configure API Key:
echo    - Open Settings: File ^> Settings ^> Tools ^> QooCode
echo    - Fill in API Key, Base URL and Model
echo    - Or set environment variables: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL
echo.
echo 3. Start Using:
echo    - Press Ctrl+Shift+T to open QooCode Terminal
echo    - Type commands to interact with AI
echo.
echo Version Information:
echo - qoocode CLI: %PACKAGE_VERSION% (bundled in plugin)
echo - JetBrains Plugin: %PACKAGE_VERSION%
echo.
echo Supported IDEs:
echo - IntelliJ IDEA 2023.1+
echo - PyCharm 2023.1+
echo - WebStorm 2023.1+
echo - Other JetBrains IDE 2023.1+
echo.
echo System Requirements:
echo - Windows 10/11
echo - JetBrains IDE 2023.1 or higher
echo - Network: Need access to OpenAI/DeepSeek API
echo.
echo Full Documentation: https://github.com/qoobots/qoocode
echo.
echo Thank you for using QooCode!
) > "%RELEASE_DIR%\INSTALL.txt"

echo [SUCCESS] Release package created: %RELEASE_DIR%
echo.

echo ========================================
echo   Build Summary
echo ========================================
echo.
dir "%RELEASE_DIR%" /b
echo.

echo Release package location: %RELEASE_DIR%
echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.

pause
