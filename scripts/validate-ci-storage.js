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
}
