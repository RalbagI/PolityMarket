import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { generatePoliticianNames } from "./scripts/generate-politician-names-he.js";

function generatePoliticianNamesPlugin() {
  return {
    name: "generate-politician-names-he",
    buildStart() {
      generatePoliticianNames(resolve("."));
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
