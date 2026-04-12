import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(scriptDir, "..");
const outputPath = path.join(functionsDir, "functions.yaml");
const binaryPath = path.join(
  functionsDir,
  "node_modules",
  "firebase-functions",
  "lib",
  "bin",
  "firebase-functions.js",
);

// DEP0040: punycode deprecation from firebase-functions internals — suppress during manifest generation only
const result = spawnSync(
  process.execPath,
  ["--disable-warning=DEP0040", binaryPath, "."],
  {
    cwd: functionsDir,
    env: {
      ...process.env,
      FUNCTIONS_MANIFEST_OUTPUT_PATH: outputPath,
    },
    stdio: "inherit",
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
