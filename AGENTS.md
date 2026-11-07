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
- **改行コードの統一 (LF)**:
  - リポジトリ内のすべてのテキストファイルは **LF (`\n`)** で統一します（CRLF の混入厳禁）。
  - `.gitattributes` および `.editorconfig` の設定に従い、Windows 環境でのコミット時にも差分汚染が発生しないよう注意してください。
- **任意ダッシュボードカードの追加**:
  - すべてのエージェントは、カード追加・変更時に [feature module ルール](.agents/rules/dashboard-feature-modules.md) と [`src/features/types.ts`](src/features/types.ts) を確認してください。
  - 任意カードは feature module として追加し、通常は App・設定モーダル・registry に機能固有の分岐を加えません。共有契約を変える場合は理由を示し、移行と関連テストも更新してください。
- **単体テストの完全性維持（都合の良い既存テスト修正の禁止）**:
  - 本体コードの修正後に既存テストが失敗した場合は、テスト側を安易に書き換えるのではなく、まず本体コードのデグレ（リグレッション）として修正してください（[単体テスト完全性ルール (`.agents/rules/testing-integrity.md`)](.agents/rules/testing-integrity.md) 参照）。
  - テストを通過させる目的での既存 `expect` の削除・緩和や不変条件テスト（[`security.test.ts`](src/services/security.test.ts)・[`storage.test.ts`](src/services/storage.test.ts)）の弱体化は厳禁です。仕様変更そのものに伴い既存テストの期待値を変更する必要がある場合は、変更理由を PR 本文および完了報告に明記してください。

---

## 🛡️ Git & ブランチ運用ルール

1. **`main` ブランチへの直接コミット・プッシュは厳格に禁止**:
   - リモートの GitHub ブランチ保護設定およびローカルの Git Hook (`.githooks/pre-commit`, `.githooks/pre-push`) の両方で保護されています。
   - 必ずトピックブランチ（例: `feature/*`, `fix/*`, `chore/*`）を作成し、Pull Request を作成してください。
2. **Pull Request の承認・マージはユーザーが実施（エージェントによるマージ・承認は厳禁）**:
   - AI エージェントの役割は、トピックブランチの作成、実装・テスト、コミット、プッシュ、PR 作成、および CI の通過確認までです。
   - **PR のレビュー・承認（Approve）・マージ（`gh pr merge` 等）は必ずユーザー自身が行います。エージェントが自ら承認やマージを実行することは厳禁です。**
   - CI のパスを確認後、ユーザーに PR の URL を案内し、レビューおよびマージを依頼して待機してください。
3. **リリース（タグ）駆動デプロイ & `CHANGELOG.md`**:
   - リリース準備時はスキル [`prepare-release`](.agents/skills/prepare-release/SKILL.md) が前回リリースタグからのコミット履歴・コード差分を解析してリリースノートを生成し、`package.json` と [`CHANGELOG.md`](CHANGELOG.md) の更新、GitHub Draft Release の作成、およびリリース PR の作成を行います。
   - リリース PR をユーザーがマージ後に、スキル [`publish-release`](.agents/skills/publish-release/SKILL.md) でタグ（`v*.*.*`）を push することでデプロイワークフロー (`deploy.yml`) が起動し、デプロイ成功後に `CHANGELOG.md` の内容で Draft Release が正式 Release として自動公開されます。
   - 運用手順の詳細は [`docs/dev/release-flow.md`](docs/dev/release-flow.md) を参照してください。

---

## 📝 Pull Request 作成 & CLI 運用ルール

GitHub CLI (`gh`) を使用して Pull Request の作成や編集を行う場合：

- **PR タイトルは日本語で記述**:
  - `feat:`, `fix:`, `docs:`, `chore:` などの Conventional Commits プレフィックスに続けて、変更内容の要約を **日本語** で記述してください（例: `fix: Actions 使用量取得エンドポイント・スコープの修正とバージョン表示の追加`）。
- **`--body-file` の使用を義務化**:
  - シェルコマンドの `--body "..."` に複数行の Markdown やバッククォートを直接渡さないでください。PowerShell 等の展開処理によって意図しないバックスラッシュ（`\`）の混入やコードブロック破損が発生します。
  - 必ず `.gitignore` 対象の `scratch/` 配下に一時的な Markdown ファイル（例: `scratch/pr_body.md`）を書き出し、`gh pr create --body-file <path>` または `gh pr edit --body-file <path>` を使用してください。送信完了後は一時ファイルを直ちに削除してください。
- **ローカル事前レビューの義務化とチェックリストの継続更新（CodeRabbit レート制限対策）**:
  - 新規 PR 作成時やレビュー修正の `git push` を行う前に、コード変更・ドキュメント変更を問わず、必ず [ローカル事前レビュールール (`.agents/rules/local-review.md`)](.agents/rules/local-review.md) およびスキル [`.agents/skills/local-review/SKILL.md`](.agents/skills/local-review/SKILL.md) に従い、独立した視点（サブエージェント等）で 2 段階レビュー（自由推論による深掘り ＋ `references/` のプロジェクト固有ベースライン照合）を実施・修正してから 1 回の Push にまとめてください。
  - また、CodeRabbit やユーザーから PR で新たな指摘を受けた際は、スキル [`.agents/skills/address-review-comments/SKILL.md`](.agents/skills/address-review-comments/SKILL.md) に従って指摘の収集・妥当性判定・修正・1 回の Push を行い、プロジェクト固有規約や非自明な仕様上の罠については再発防止のため [`.agents/skills/local-review/references/`](.agents/skills/local-review/references/) の該当チェックリストに厳選・統合して還元してください。`@coderabbitai review` 等のレビュー再実行コメントをエージェントが自動投稿することは禁止します。
- 詳細ルール: [`.agents/rules/cli-markdown-escaping.md`](.agents/rules/cli-markdown-escaping.md), [`.agents/rules/windows-shell-commands.md`](.agents/rules/windows-shell-commands.md), [`.agents/rules/local-review.md`](.agents/rules/local-review.md), [`.agents/rules/testing-integrity.md`](.agents/rules/testing-integrity.md)

---

## 🛠 主要コマンド

- `npm run dev`: ローカル開発サーバーを起動 (`http://localhost:5173/`)
- `npm test`: 単体テストを実行 (`vitest run`)
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
- 🚀 [開発・ブランチ・リリース運用ガイド (`docs/dev/release-flow.md`)](docs/dev/release-flow.md)（AI 開発ループ & 指示チートシート含む）
- 🧪 [テスト方針 & テスト観点仕様書 (`docs/dev/testing.md`)](docs/dev/testing.md)
- 🗺️ [開発ロードマップ & 実装実績 (`docs/dev/roadmap.md`)](docs/dev/roadmap.md)
- 📋 [変更履歴 (`CHANGELOG.md`)](CHANGELOG.md)
