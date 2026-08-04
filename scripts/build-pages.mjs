import { execSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";

const apiDir = "src/app/api";
const apiBackup = "src/app/_api_pages_backup";

function restoreApiDir() {
  if (existsSync(apiBackup)) {
    renameSync(apiBackup, apiDir);
  }
}

try {
  if (existsSync(apiDir)) {
    renameSync(apiDir, apiBackup);
  }

  execSync("next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      GH_PAGES: "1",
    },
  });
} finally {
  restoreApiDir();
}
