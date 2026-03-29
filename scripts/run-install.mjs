/**
 * Cross-platform install entry: Windows PowerShell (install.ps1), else bash (install.sh).
 * Optional: --install-system-ffmpeg (PATH ffmpeg as fallback; TTS uses ffmpeg-static by default)
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(scriptsDir, "..");
const args = process.argv.slice(2);
const installSystemFfmpeg = args.includes("--install-system-ffmpeg");

if (os.platform() === "win32") {
  const psArgs = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(scriptsDir, "install.ps1"),
  ];
  if (installSystemFfmpeg) psArgs.push("-InstallSystemFfmpeg");
  for (const exe of ["powershell.exe", "pwsh"]) {
    const r = spawnSync(exe, psArgs, { cwd: root, stdio: "inherit" });
    if (r.error?.code === "ENOENT") continue;
    process.exit(r.status ?? 1);
  }
  console.error("Neither powershell.exe nor pwsh found on PATH.");
  process.exit(1);
}

const bashArgs = [path.join(scriptsDir, "install.sh")];
if (installSystemFfmpeg) bashArgs.push("--install-system-ffmpeg");
const r = spawnSync("bash", bashArgs, { cwd: root, stdio: "inherit" });
process.exit(r.status === null ? 1 : r.status);
