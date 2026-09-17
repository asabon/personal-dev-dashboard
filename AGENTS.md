# AI Coding Agent Guidelines (`AGENTS.md`)

This repository is an open-source project designed as a zero-backend, client-side SPA for GitHub Actions & PR integration.
All AI coding agents (Antigravity, Cursor, Claude Code, GitHub Copilot, etc.) working on this repository must strictly follow these instructions.

---

## 🏛 Project Architecture & Constraints

- **Zero-Backend (Client-Only)**:
  - This application runs entirely in the user's browser (hosted statically on GitHub Pages).
  - Never introduce external backend servers or proxy APIs.
  - Personal Access Tokens (PAT) are stored exclusively in `localStorage` and sent directly to `api.github.com` via client-side CORS.
- **Tech Stack**:
  - React 19 + TypeScript (strict mode) + Vite + Tailwind CSS v4 + Lucide Icons.
  - Keep root configuration minimal: use a single, unified `tsconfig.json`.

---

## 🛡️ Git & Branch Workflow Rules

1. **Direct Commits to `main` are Strictly Forbidden**:
   - Both remote GitHub branch protection and local Git hooks (`.githooks/pre-commit`, `.githooks/pre-push`) are enforced.
   - Always create a dedicated topic branch (e.g., `feature/*`, `fix/*`, `chore/*`) and submit a Pull Request.
2. **Release-Driven Deployments**:
   - Merging to `main` does NOT immediately deploy to production. Production deployments are triggered by GitHub Releases / version tags (`v*.*.*`).
   - Detailed workflow: see [`docs/release-flow.md`](docs/release-flow.md).

---

## 📝 CLI & Shell Markdown Escaping Rules

When using the GitHub CLI (`gh`) to create or edit Pull Requests:

- **Mandatory `--body-file` usage**:
  - NEVER pass multi-line Markdown or backticks directly via `--body "..."` in shell commands. Doing so causes escaping artifacts (such as unintended backslashes `\` and broken code formatting).
  - Always write the PR description to a temporary Markdown file and use `gh pr create --body-file <path>` or `gh pr edit --body-file <path>`. Clean up temporary files immediately.
- Detailed rule: see [`.agents/rules/cli-markdown-escaping.md`](.agents/rules/cli-markdown-escaping.md).

---

## 🛠 Useful Commands

- `npm run dev`: Start local Vite development server (`http://localhost:5173/`)
- `npm run typecheck`: Run TypeScript type checking (`tsc --noEmit`)
- `npm run build`: Build production bundle (`tsc && vite build`)
- `npm run preview`: Preview production build locally

---

## 📚 Detailed Specifications

- 🏛️ [Architecture & Security (`docs/architecture.md`)](docs/architecture.md)
- 📡 [GitHub API & GraphQL Rollup Design (`docs/api-design.md`)](docs/api-design.md)
- 🧩 [Data Models & State (`docs/data-model.md`)](docs/data-model.md)
- 🖥️ [UI / UX Component Design (`docs/ui-design.md`)](docs/ui-design.md)
- 🚀 [Development & Release Flow (`docs/release-flow.md`)](docs/release-flow.md)
