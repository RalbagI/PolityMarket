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
      "tests/component/**/*.test.{js,jsx}",
      "src/components/**/*.test.{js,jsx}",
      "src/App*.test.{js,jsx}",
    ],
    exclude: ["tests/unit/**", "tests/integration/**", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      reportsDirectory: process.env.COVERAGE_DIR || "coverage/component",
      include: ["src/App.jsx", "src/components/**/*.{js,jsx}"],
      exclude: ["src/test/**", "src/main.jsx"],
    },
  },
});
