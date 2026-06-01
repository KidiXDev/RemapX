# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React + TypeScript frontend.
- `src/components/`: Reusable UI (`common/`, `layout/`, and feature templates).
- `src/pages/`: Route-level screens (for example `remap.tsx`, `settings.tsx`).
- `src/hooks/` and `src/lib/`: Shared hooks and utility helpers.
- `src-tauri/`: Rust backend for Tauri (`src/main.rs`, `src/lib.rs`), app config (`tauri.conf.json`), and icons/capabilities.
- `public/`: Static files served by Vite.

Keep feature logic close to its page/component. Reuse existing primitives in `src/components/common` before adding new UI building blocks.

## Build, Test, and Development Commands
- `bun run dev`: Start Vite dev server for frontend iteration.
- `bun run build`: Run TypeScript compile check and produce production frontend build.
- `bun run preview`: Preview the built frontend locally.
- `bun run typecheck`: Run TypeScript type checks only (`tsc -noEmit`).
- `bun run tauri dev`: Run the desktop app with Tauri + frontend.
- `bun run tauri build`: Build distributable desktop binaries.

## Coding Style & Naming Conventions
- Use TypeScript + React functional components.
- Follow Prettier config (`.prettierrc`) with 2-space indentation and import ordering plugins.
- Prefer `kebab-case` for file names (`use-settings-store.ts`), `PascalCase` for React component names, and descriptive hook/util names.
- Keep functions small and avoid deep nesting; extract repeated logic into `src/lib` or `src/hooks`.

## Testing Guidelines
- No dedicated test framework is configured yet.
- At minimum, run `bun run typecheck` before opening a PR.
- For Rust-side changes, also run `cargo check` inside `src-tauri/`.

## Security & Configuration Tips
- Do not commit secrets or machine-specific paths.
- Review `src-tauri/capabilities/default.json` and `tauri.conf.json` when changing native permissions.
- Keep dependencies minimal and align with existing patterns before introducing new packages.

## Additional Notes
If you need additional dependency, you are not allowed to install it yourself. You must inform to the user to install manually. After that give user instruction to type `continue` after they installed it to continue.