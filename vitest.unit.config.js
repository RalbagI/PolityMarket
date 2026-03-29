import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test", quiet: true });

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: [
      "tests/unit/**/*.test.{js,jsx}",
      "src/lib/**/*.test.{js,jsx}",
      "src/store.test.js",
      "data-pipeline/**/*.test.{js,jsx}",
    ],
    exclude: ["tests/component/**", "tests/integration/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: process.env.COVERAGE_DIR || "coverage/unit",
      include: [
        "src/lib/**/*.{js,jsx}",
        "src/store.js",
        "data-pipeline/lib/**/*.js",
        "data-pipeline/generateDailyScores.js",
      ],
      exclude: ["src/test/**", "src/main.jsx"],
    },
  },
});
