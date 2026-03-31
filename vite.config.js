import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

function generatePoliticianNamesPlugin() {
  return {
    name: "generate-politician-names-he",
    buildStart() {
      const root = resolve(".");
      const translation = JSON.parse(
        readFileSync(resolve(root, "src/locales/he/translation.json"), "utf-8"),
      );
      const names = translation.politicians || {};
      writeFileSync(
        resolve(root, "public/data/politician_names_he.json"),
        JSON.stringify(names, null, 2) + "\n",
        "utf-8",
      );
    },
  };
}

export default defineConfig({
  plugins: [
    generatePoliticianNamesPlugin(),
    react({
      babel: {
        plugins:
          process.env.NODE_ENV === "production"
            ? [["react-remove-properties", { properties: ["data-testid"] }]]
            : [],
      },
    }),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/recharts")) {
            return "vendor-charts";
          }
          if (id.includes("node_modules/d3-")) {
            return "vendor-d3";
          }
          if (id.includes("node_modules/i18next") || id.includes("node_modules/react-i18next")) {
            return "vendor-i18n";
          }
          if (id.includes("node_modules/zustand")) {
            return "vendor-state";
          }
        },
      },
    },
  },
});
