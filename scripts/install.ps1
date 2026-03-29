# Windows Setup Assistant (PowerShell 5+). Run from repository root:
#   powershell -ExecutionPolicy Bypass -File scripts/install.ps1
# Optional: -InstallSystemFfmpeg (attempts to auto-install ffmpeg, requires admin for choco)
param(
  [switch]$InstallSystemFfmpeg
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

Write-Title "Panda Video Generator - Windows Setup"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js not found. Please install Node.js 20 LTS: https://nodejs.org/" -ForegroundColor Red
  exit 1
}

$version = node -e "console.log(process.version)"
$parts = $version.Substring(1) -split "\."
$major = [int]$parts[0]
$minor = [int]$parts[1]

if ($major -lt 20 -or ($major -eq 20 -and $minor -lt 9)) {
  Write-Host "Node.js >= 20.9 required (Current: $version). Please upgrade." -ForegroundColor Red
  exit 1
}
Write-Host "OK Node.js $version" -ForegroundColor Green

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "Enabling pnpm via Corepack..."
  corepack enable
  corepack prepare pnpm@latest --activate
}
Write-Host "OK pnpm $(pnpm -v)" -ForegroundColor Green

if ($InstallSystemFfmpeg) {
  Write-Host ""
  Write-Host "Attempting to auto-install ffmpeg..."
  $installed = $false
  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

  # Try winget
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    Write-Host "Trying installation via winget..."
    winget install -e --id Gyan.FFmpeg --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -eq 0) { $installed = $true }
  }

  # Try Chocolatey if admin
  if (-not $installed -and $isAdmin) {
    $choco = Get-Command choco -ErrorAction SilentlyContinue
    if ($choco) {
      Write-Host "Trying installation via Chocolatey (requires admin privileges)..."
      choco install ffmpeg -y
      if ($LASTEXITCODE -eq 0) { $installed = $true }
    }
  }

  # Download static build if all else fails
  if (-not $installed) {
    Write-Host "Trying to download static build..."
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

      # Add to user PATH
      $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
      if ($userPath -notlike "*$ffmpegDir*") {
        $newPath = "$userPath;$ffmpegDir"
        [Environment]::SetEnvironmentVariable('Path', $newPath, [System.EnvironmentVariableTarget]::User)
      }
      $env:Path = "$env:Path;$ffmpegDir"
      $installed = $true
    } catch {
      Write-Host 'Auto download failed. Please manually download from https://ffmpeg.org/download.html and add to PATH.' -ForegroundColor Yellow
    }
  }

  if ($installed) {
    Write-Host "OK ffmpeg installed successfully" -ForegroundColor Green
  } else {
    Write-Host "ffmpeg installation failed (can be ignored if not using TTS)" -ForegroundColor Yellow
  }
} else {
  if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "ffmpeg not found. For TTS support, install manually: winget install Gyan.FFmpeg or choco install ffmpeg (admin privileges)" -ForegroundColor Yellow
  } else {
    Write-Host "OK ffmpeg available" -ForegroundColor Green
  }
}

Write-Host ""
Write-Host "Running pnpm install (workspaces and Playwright Chromium)..."
pnpm install

Write-Host ""
Write-Host "Setup complete. You can now run: pnpm check:setup" -ForegroundColor Green