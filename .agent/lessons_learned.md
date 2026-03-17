# Lessons Learned

> Runtime lessons captured by workflow memory system.
> New entries are appended by /prepare-for-merge and /resolve-issue workflows.

## Initial Setup (2026-03-17)

- Use `--legacy-peer-deps` when installing npm packages due to Vite 8 / Tailwind CSS peer dependency conflict.
- `react-is` must be explicitly installed as a dependency for `recharts` to work with Vite 8 production builds.
- Tailwind CSS v4 uses `@import "tailwindcss"` instead of `@tailwind` directives.
