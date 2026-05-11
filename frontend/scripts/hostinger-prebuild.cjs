/**
 * Hostinger (Linux) sometimes extracts uploads with directory modes that block
 * `next build` from scanning `src/app/api/*` (EACCES on scandir). Fix owner
 * traverse/read before build. No-op on Windows (local dev).
 */
const { execSync } = require("child_process");

if (process.platform === "win32") {
  process.exit(0);
}

try {
  execSync("chmod -R u+rwX .", { stdio: "inherit", cwd: process.cwd() });
} catch {
  try {
    execSync("chmod -R a+rX .", { stdio: "inherit", cwd: process.cwd() });
  } catch {
    process.exitCode = 0;
  }
}
