@echo off
chcp 65001 >nul
cd /d "%~dp0"
curl -s -o nul -m 2 http://127.0.0.1:4173/ && (echo 服务已在运行，直接打开浏览器... & start "" http://127.0.0.1:4173/ & exit /b)
if not exist "dist\index.html" (
  echo [1/2] 首次使用：正在构建站点，请稍候约 30 秒...
  call npm run build
  if errorlevel 1 (echo 构建失败，请把窗口截图发给 Agent & pause & exit /b 1)
)
echo [2/2] 启动本地服务（此窗口别关——关了网站就停；改过内容请删 dist 文件夹再双击）
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:4173/"
npx vite preview --host 127.0.0.1 --port 4173
