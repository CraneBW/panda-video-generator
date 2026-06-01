/**
 * Patches @remotion/renderer port-config.js for WSL2.
 *
 * In WSL2, TCP connections to 127.0.0.1 and 0.0.0.0 on free ports timeout
 * instead of returning ECONNREFUSED. This causes Remotion's port checker
 * to report all ports as unavailable.
 *
 * Fix: Only use ::1 (IPv6 loopback) for port availability checks, since
 * it correctly returns ECONNREFUSED on free ports.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));

const modulesDir = join(root, "node_modules", ".pnpm");
if (!existsSync(modulesDir)) {
  process.exit(0);
}

const OLD =
  "const getHostsToTry = (flattened) => {\n" +
  "    return [\n" +
  "        (0, exports.hasIPv6LoopbackAddress)(flattened) ? '::1' : null,\n" +
  "        (0, exports.hasIpv4LoopbackAddress)(flattened) ? '127.0.0.1' : null,\n" +
  "        (0, exports.isIpV6Supported)(flattened) ? '::' : null,\n" +
  "        '0.0.0.0',\n" +
  "    ].filter(truthy_1.truthy);\n" +
  "};";

const NEW =
  "const getHostsToTry = (flattened) => {\n" +
  "    // WSL2: 127.0.0.1 and 0.0.0.0 connections timeout instead of ECONNREFUSED,\n" +
  "    // causing all ports to appear unavailable. Only ::1 returns correct errors.\n" +
  "    return [\n" +
  "        (0, exports.hasIPv6LoopbackAddress)(flattened) ? '::1' : null,\n" +
  "    ].filter(truthy_1.truthy);\n" +
  "};";

let patched = 0;
for (const dir of readdirSync(modulesDir)) {
  if (!dir.startsWith("@remotion+renderer@")) continue;

  const file = join(
    modulesDir,
    dir,
    "node_modules",
    "@remotion",
    "renderer",
    "dist",
    "port-config.js",
  );

  if (!existsSync(file)) continue;

  try {
    let content = readFileSync(file, "utf8");
    if (content.includes(OLD)) {
      content = content.replace(OLD, NEW);
      writeFileSync(file, content);
      console.log(`[patch-remotion-wsl2] Patched: ${file}`);
      patched++;
    } else if (content.includes(NEW)) {
      console.log(`[patch-remotion-wsl2] Already patched: ${file}`);
    }
  } catch (err) {
    console.error(`[patch-remotion-wsl2] Failed:`, err.message);
  }
}
