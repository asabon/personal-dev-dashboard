# AI コーディングエージェント開発ガイドライン (`AGENTS.md`)

このリポジトリは、GitHub Actions の無料枠使用量と複数リポジトリの PR / CI 状況を統合管理する、完全クライアント完結型 (Zero-Backend SPA) のオープンソースプロジェクトです。
本リポジトリで作業するすべての AI コーディングエージェント（Antigravity、Cursor、Claude Code、GitHub Copilot など）は、以下のルールと制約を厳格に遵守してください。

---

## 🏛 プロジェクトアーキテクチャと制約事項

- **完全クライアント完結 (Zero-Backend)**:
  - 本アプリケーションはユーザーのブラウザ内（GitHub Pages による静的配信）で完結して動作します。
  - 外部のバックエンドサーバーやプロキシ API を絶対に追加しないでください。
  - Personal Access Token (PAT) はブラウザの `localStorage` にのみ保存し、クライアント側から直接 CORS 経由で `api.github.com` と通信します。
- **技術スタック**:
  - React 19 + TypeScript (strict モード) + Vite + Tailwind CSS v4 + Lucide Icons。
  - ルート設定は最小限に保ち、単一の統合された `tsconfig.json` を使用してください。

---

## 🛡️ Git & ブランチ運用ルール

1. **`main` ブランチへの直接コミット・プッシュは厳格に禁止**:
   - リモートの GitHub ブランチ保護設定およびローカルの Git Hook (`.githooks/pre-commit`, `.githooks/pre-push`) の両方で保護されています。
   - 必ずトピックブランチ（例: `feature/*`, `fix/*`, `chore/*`）を作成し、Pull Request を作成してマージしてください。
2. **リリース（タグ）駆動デプロイ & Release Drafter**:
   - `main` ブランチへの通常マージ時は **Release Drafter** が自動起動し、ドラフトリリースノート（"Next release"）を更新・蓄積します。
   - リリース時はリリース PR をマージ後にタグ（`v*.*.*`）を push することで、デプロイワークフロー (`deploy.yml`) が起動し、デプロイ成功後にドラフトが自動で正式 Release として公開されます。
   - リリース作業は専用スキル [`.agents/skills/prepare-release/SKILL.md`](.agents/skills/prepare-release/SKILL.md) および [`.agents/skills/publish-release/SKILL.md`](.agents/skills/publish-release/SKILL.md) の手順に従って実行してください。
   - 運用手順の詳細は [`docs/dev/release-flow.md`](docs/dev/release-flow.md) を参照してください。

---

## 📝 Pull Request 作成 & CLI 運用ルール

GitHub CLI (`gh`) を使用して Pull Request の作成や編集を行う場合：

- **PR タイトルは日本語で記述**:
  - `feat:`, `fix:`, `docs:`, `chore:` などの Conventional Commits プレフィックスに続けて、変更内容の要約を **日本語** で記述してください（例: `fix: Actions 使用量取得エンドポイント・スコープの修正とバージョン表示の追加`）。
- **`--body-file` の使用を義務化**:
  - シェルコマンドの `--body "..."` に複数行の Markdown やバッククォートを直接渡さないでください。PowerShell 等の展開処理によって意図しないバックスラッシュ（`\`）の混入やコードブロック破損が発生します。
  - 必ず一時的な Markdown ファイルに本文を書き出し、`gh pr create --body-file <path>` または `gh pr edit --body-file <path>` を使用してください。送信完了後は一時ファイルを直ちに削除してください。
- 詳細ルール: [`.agents/rules/cli-markdown-escaping.md`](.agents/rules/cli-markdown-escaping.md)

---

## 🛠 主要コマンド

- `npm run dev`: ローカル開発サーバーを起動 (`http://localhost:5173/`)
- `npm run typecheck`: TypeScript 型チェックを実行 (`tsc --noEmit`)
- `npm run build`: プロダクションビルドを実行 (`tsc && vite build`)
- `npm run preview`: 本番ビルド成果物をローカルでプレビュー

---

## 📚 ドキュメント一覧

### 利用者向けガイド
- 🔑 [GitHub PAT 作成・設定ガイド (`docs/user/setup-pat.md`)](docs/user/setup-pat.md)

### 開発・設計ドキュメント
- 🏛️ [アーキテクチャ & セキュリティ設計 (`docs/dev/architecture.md`)](docs/dev/architecture.md)
- 📡 [GitHub API & GraphQL Rollup 設計 (`docs/dev/api-design.md`)](docs/dev/api-design.md)
- 🧩 [データモデル & State 定義 (`docs/dev/data-model.md`)](docs/dev/data-model.md)
- 🖥️ [UI / UX コンポーネント設計 (`docs/dev/ui-design.md`)](docs/dev/ui-design.md)
- 🚀 [開発・ブランチ・リリース運用ガイド (`docs/dev/release-flow.md`)](docs/dev/release-flow.md)
- 🗺️ [開発ロードマップ & 実装実績 (`docs/dev/roadmap.md`)](docs/dev/roadmap.md)
