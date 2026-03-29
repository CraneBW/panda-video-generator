# Windows 安装助手 (PowerShell 5+)。从仓库克隆根目录运行：
#   powershell -ExecutionPolicy Bypass -File scripts/install.ps1
# 可选：-SkipFfmpeg
param(
  [switch]$SkipFfmpeg
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Write-Title {
  param([string]$Text)
  Write-Host ""
  Write-Host "--------------------------------------------------" -ForegroundColor Cyan
  Write-Host " $Text" -ForegroundColor Cyan
  Write-Host "--------------------------------------------------" -ForegroundColor Cyan
  Write-Host ""
}

Write-Title "Panda Video Generator - Windows 设置"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "未找到 Node.js。请安装 Node.js 20 LTS：https://nodejs.org/" -ForegroundColor Red
  exit 1
}

$version = node -e "console.log(process.version)"
$parts = $version.Substring(1) -split "\."
$major = [int]$parts[0]
$minor = [int]$parts[1]

if ($major -lt 20 -or ($major -eq 20 -and $minor -lt 9)) {
  Write-Host "需要 Node.js >= 20.9（当前：$version）。请升级。" -ForegroundColor Red
  exit 1
}
Write-Host "OK Node.js $version" -ForegroundColor Green

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "正在通过 Corepack 启用 pnpm..."
  corepack enable
  corepack prepare pnpm@latest --activate
}
Write-Host "OK pnpm $(pnpm -v)" -ForegroundColor Green

if (-not $SkipFfmpeg) {
  if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "未找到 ffmpeg。尝试自动安装..."
    $installed = $false

    # 尝试 winget
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
      Write-Host "尝试通过 winget 安装..."
      winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
      if ($LASTEXITCODE -eq 0) {
        $installed = $true
      }
    }

    # 如果 winget 失败，尝试 Chocolatey
    if (-not $installed) {
      $choco = Get-Command choco -ErrorAction SilentlyContinue
      if ($choco) {
        Write-Host "尝试通过 Chocolatey 安装..."
        choco install ffmpeg -y
        if ($LASTEXITCODE -eq 0) {
          $installed = $true
        }
      }
    }

    # 如果都失败，下载静态构建
    if (-not $installed) {
      Write-Host "尝试下载静态构建..."
      try {
        $ffmpegDir = "$env:USERPROFILE\bin\ffmpeg"
        if (-not (Test-Path $ffmpegDir)) {
          New-Item -ItemType Directory -Path $ffmpegDir -Force | Out-Null
        }
        $zipPath = "$env:TEMP\ffmpeg.zip"
        Invoke-WebRequest -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" -OutFile $zipPath
        Expand-Archive -Path $zipPath -DestinationPath $env:TEMP\ffmpeg-temp -Force
        $extractedDir = Get-ChildItem "$env:TEMP\ffmpeg-temp" | Where-Object { $_.PSIsContainer } | Select-Object -First 1
        Copy-Item "$extractedDir\bin\*" $ffmpegDir -Force
        Remove-Item $zipPath, "$env:TEMP\ffmpeg-temp" -Recurse -Force

        # 添加到用户 PATH
        $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
        if ($userPath -notlike "*$ffmpegDir*") {
          [Environment]::SetEnvironmentVariable("Path", "$userPath;$ffmpegDir", "User")
        }
        $env:Path = "$env:Path;$ffmpegDir"
        $installed = $true
      } catch {
        Write-Host "自动下载失败。请手动从 https://ffmpeg.org/download.html 下载并添加到 PATH。" -ForegroundColor Yellow
      }
    }

    if (-not $installed) {
      Write-Host "ffmpeg 安装失败（如果不使用 TTS 可以忽略）" -ForegroundColor Yellow
    }
  }
  if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
    Write-Host "OK ffmpeg 可用" -ForegroundColor Green
  }
} else {
  Write-Host "跳过 ffmpeg 安装 (-SkipFfmpeg)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "正在运行 pnpm install（工作区和 Playwright Chromium）..."
pnpm install

Write-Host ""
Write-Host "设置完成。您现在可以运行：pnpm check:setup" -ForegroundColor Green
