@echo off
chcp 65001 >nul
title 澳味智译 · 本地启动
cd /d %~dp0

rem 本机未安装全局 Node，使用便携版（D:\tools\node）
set "PATH=D:\tools\node;%PATH%"

if not exist node_modules (
  echo 首次运行：正在安装依赖（npmmirror 国内镜像，约 1-2 分钟）...
  call npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)

echo.
echo  澳味智译已启动：http://localhost:4173
echo  游客端  http://localhost:4173/
echo  商户端  http://localhost:4173/?page=merchant
echo  管理端  http://localhost:4173/?page=admin
echo.
echo  关闭本窗口即停止服务。
echo.

rem 2 秒后自动打开浏览器（等服务器就绪）
start "" cmd /c "timeout /t 2 >nul & start http://localhost:4173"
node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 4173

