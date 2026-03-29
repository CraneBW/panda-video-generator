#!/usr/bin/env bash
# macOS / Linux install helper. On Windows, use `pnpm install:project` or install.ps1.
# Usage (from repo root): bash scripts/install.sh [--install-system-ffmpeg]
# Legacy: --skip-ffmpeg (no longer required; system ffmpeg is opt-in only)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

INSTALL_SYSTEM_FFMPEG=false
for arg in "$@"; do
  case "$arg" in
    --install-system-ffmpeg) INSTALL_SYSTEM_FFMPEG=true ;;
    --skip-ffmpeg) ;; # legacy no-op: we do not install system ffmpeg by default
  esac
done

KERNEL="$(uname -s 2>/dev/null || echo unknown)"

if [[ "$KERNEL" =~ ^(MINGW|MSYS|CYGWIN_NT) ]]; then
  echo "检测到 Windows 环境，改用 PowerShell 安装脚本…"
  POWERSHELL="${POWERSHELL:-powershell.exe}"
  if ! command -v "$POWERSHELL" >/dev/null 2>&1 && command -v pwsh >/dev/null 2>&1; then
    POWERSHELL=pwsh
  fi
  EXTRA=()
  [[ "$INSTALL_SYSTEM_FFMPEG" == true ]] && EXTRA+=("-InstallSystemFfmpeg")
  exec "$POWERSHELL" -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT_DIR/install.ps1" "${EXTRA[@]}"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Panda Video Generator — 安装依赖（macOS / Linux）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

need_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "❌ 未检测到 Node.js。请先安装 Node.js 20 LTS: https://nodejs.org/"
    exit 1
  fi
  if ! node -e 'const p=process.version.slice(1).split(".").map(Number);process.exit(p[0]>20||(p[0]===20&&p[1]>=9)?0:1)'; then
    echo "❌ 需要 Node.js >= 20.9（当前: $(node -v)）。请升级: https://nodejs.org/"
    exit 1
  fi
  echo "✅ Node.js $(node -v)"
}

ensure_pnpm() {
  if command -v pnpm >/dev/null 2>&1; then
    echo "✅ pnpm $(pnpm -v)"
    return
  fi
  echo "正在通过 Corepack 启用 pnpm…"
  corepack enable
  corepack prepare pnpm@latest --activate
  echo "✅ pnpm $(pnpm -v)"
}

ensure_ffmpeg_system_optional() {
  if [[ "$INSTALL_SYSTEM_FFMPEG" != true ]]; then
    return
  fi
  if command -v ffmpeg >/dev/null 2>&1; then
    echo "✅ 系统 ffmpeg 已在 PATH"
    return
  fi
  echo "正在按系统安装 ffmpeg（可选备用，非 TTS 所必需）…"
  case "$KERNEL" in
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        brew install ffmpeg
      else
        echo "❌ 未安装 Homebrew，无法自动安装 ffmpeg。见 https://brew.sh"
        exit 1
      fi
      ;;
    Linux)
      if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq
        sudo apt-get install -y ffmpeg
      elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y ffmpeg-free || sudo dnf install -y ffmpeg
      elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y ffmpeg
      elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -S --noconfirm ffmpeg
      else
        echo "⚠️  无法识别包管理器，请手动安装 ffmpeg"
        exit 1
      fi
      ;;
    *)
      echo "⚠️  未知系统 ($KERNEL)，请手动安装 ffmpeg"
      exit 1
      ;;
  esac
  command -v ffmpeg >/dev/null 2>&1 && echo "✅ 系统 ffmpeg 已就绪"
}

need_node
ensure_pnpm

echo ""
echo "ℹ️  TTS / 封面默认使用依赖内的 **ffmpeg-static**（随 pnpm install 下载，无需 brew/apt 安装 ffmpeg）。"
echo "   若需 PATH 中的系统 ffmpeg 作备用，可使用: bash scripts/install.sh --install-system-ffmpeg"
echo ""

ensure_ffmpeg_system_optional

echo ""
echo "正在执行 pnpm install（workspace、ffmpeg-static 构建脚本、Playwright Chromium；请保持网络畅通）…"
pnpm install

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ 安装完成。可运行 pnpm check:setup 自检。"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
