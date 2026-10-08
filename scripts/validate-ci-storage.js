import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export function validateWorkflowStorage(text, file = "workflow") {
  assert.doesNotMatch(
    text,
    /upload-artifact|download-artifact|actions\/cache|cache:\s*['"]?npm|gh\s+run\s+download|gh\s+release\s+upload/,
    `${file}: CI archives and project cache retention belong in the private local store`
  );
  if (text.includes("github/codeql-action/init"))
    assert.match(
      text,
      /dependency-caching:\s*false/,
      `${file}: CodeQL project dependency cache must be disabled`
    );
  if (text.includes("github/codeql-action/analyze"))
    assert.match(
      text,
      /upload-database:\s*false/,
      `${file}: CodeQL source database archives must remain local`
    );
}

export function validateWorkflowDirectory(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isFile() && /\.ya?ml$/.test(entry.name))
      validateWorkflowStorage(readFileSync(path.join(directory, entry.name), "utf8"), entry.name);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  validateWorkflowDirectory(fileURLToPath(new URL("../.github/workflows/", import.meta.url)));
