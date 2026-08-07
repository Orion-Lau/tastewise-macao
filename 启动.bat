@echo off
chcp 65001 >nul
title 澳味智譯 · 本地啓動
cd /d %~dp0

rem 本機未安裝全局 Node，使用便攜版（D:\tools\node）
set "PATH=D:\tools\node;%PATH%"

if not exist node_modules (
  echo 首次運行：正在安裝依賴（npmmirror 國內鏡像，約 1-2 分鐘）...
  call npm install --registry=https://registry.npmmirror.com --no-audit --no-fund
  if errorlevel 1 (
    echo 依賴安裝失敗，請檢查網絡後重試。
    pause
    exit /b 1
  )
)

echo.
echo  澳味智譯已啓動：http://localhost:4173
echo  遊客端  http://localhost:4173/
echo  商戶端  http://localhost:4173/?page=merchant
echo  管理端  http://localhost:4173/?page=admin
echo.
echo  關閉本窗口即停止服務。
echo.

rem 2 秒後自動打開瀏覽器（等服務器就緒）
start "" cmd /c "timeout /t 2 >nul & start http://localhost:4173"
node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 4173

