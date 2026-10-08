import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

for (const file of readdirSync(".github/workflows")) {
  const text = readFileSync(path.join(".github/workflows", file), "utf8");
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
