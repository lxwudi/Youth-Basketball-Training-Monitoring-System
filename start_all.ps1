$ErrorActionPreference = 'Stop'

function Ensure-Exe {
    param(
        [string]$Name,
        [string]$Exe
    )
    if (-not (Get-Command $Exe -ErrorAction SilentlyContinue)) {
        Write-Host "$Name 未检测到，请先安装后重试"
        exit 1
    }
}

# 切换到脚本所在根目录
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
Write-Host "项目根目录: $Root"

# 基础环境检查（使用可执行文件名，而非带参数的字符串）
Ensure-Exe -Name "Python" -Exe "py"
Ensure-Exe -Name "Node.js" -Exe "node"
Ensure-Exe -Name "npm" -Exe "npm"

# 启动后端服务
Write-Host "启动后端服务..."
$BackendMain = Join-Path $Root "start_backend.py"
$BackendSimple = Join-Path $Root "simple_server.py"
$BackendStarted = $false

try {
    Start-Process -FilePath "py" -ArgumentList @("-X","utf8", $BackendMain) -WorkingDirectory $Root -WindowStyle Hidden
    $BackendStarted = $true
    Write-Host "后端已启动 (full): http://localhost:5000"
} catch {
    Write-Host "启动完整后端失败，尝试启动简化后端..."
    try {
        Start-Process -FilePath "py" -ArgumentList @("-X","utf8", $BackendSimple) -WorkingDirectory $Root -WindowStyle Hidden
        $BackendStarted = $true
        Write-Host "后端已启动 (simple): http://localhost:5000"
    } catch {
        Write-Host "后端启动失败: $($_.Exception.Message)"
    }
}

# 启动前端服务
$FrontEndDir = Join-Path $Root "front-end"
if (-not (Test-Path $FrontEndDir)) {
    Write-Host "未找到前端目录: $FrontEndDir"
    exit 1
}

if (-not (Test-Path (Join-Path $FrontEndDir "node_modules"))) {
    Write-Host "安装前端依赖... (npm install)"
    Start-Process -FilePath "npm" -ArgumentList @("install") -WorkingDirectory $FrontEndDir -NoNewWindow -Wait
}

Write-Host "启动前端开发服务器... (npm run dev)"
Start-Process -FilePath "npm" -ArgumentList @("run","dev") -WorkingDirectory $FrontEndDir -NoNewWindow

Write-Host "前端预览地址: http://localhost:5173/"
Start-Process "http://localhost:5173/"