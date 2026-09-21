---
description: Rules for GitHub CLI (gh) PR descriptions and shell markdown escaping
---

# GitHub CLI & Shell Markdown Escaping Rules

## PR 本文・複数行 Markdown 送信時の `--body-file` 必須ルール

Windows / PowerShell 環境下で `gh pr create` や `gh pr edit` に `--body "..."` でインライン文字列を渡すと、バッククォート（` ` `）のエスケープによるバックスラッシュ（`\`）の残留や改行コード破損のトラブルが発生します。

これを恒久的に防止するため、以下のルールを厳格に適用します：

### 1. 複数行の PR 本文は必ず `--body-file` を使用する
- コマンド引数への直接インライン展開（`--body "..."`）は行わない。
- 一時ファイル（例: `temp_pr_body.md` や scratch 領域）に完全な Markdown を書き出し、`gh pr create --body-file <path>` / `gh pr edit --body-file <path>` で送信すること。
- 送信完了後、一時ファイルは速やかに削除する。

### 2. PR タイトルは日本語で記述する
- `feat:`, `fix:`, `docs:`, `chore:` などのプレフィックスに続けて、変更内容の要約を **日本語** で記述すること（例: `fix: Actions 使用量取得エンドポイント・スコープの修正とバージョン表示の追加`）。

### 3. 作成後の自動検証
- PR 作成後は `gh pr view <number>` を実行し、本文に不要なエスケープ文字（`\`）や記号崩れがないか確認すること。
