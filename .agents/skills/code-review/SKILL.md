---
name: code-review
description: Perform a comprehensive CodeRabbit-equivalent code review on current branch/working-tree changes against main, before git push/PR creation or on demand.
---

# コードレビュースキル (`code-review`)

実装中の変更（未コミット変更を含む）やトピックブランチ全体の差分に対して、独立した視点で CodeRabbit 相当のコードレビューを実施するスキルです。
コミット前・PR 作成前・Push 前の事前点検、およびユーザーから「コードレビューして」と依頼された際に使用します。

---

## 📚 参照チェックリスト (`references/`)

レビュー実施時は、変更内容に応じて同階層 `references/` 配下のチェックリストを必ず参照してください：

1. **[TypeScript / React / UI チェックリスト (`references/typescript-react.md`)](references/typescript-react.md)**
   - 状態遷移（`isLoading` vs `isSilent`）、部分失敗時の前回データ保持・Stale 更新破棄、Map/Set 集約キー衝突、進行中ジョブ保護、サマリーバッジと残余（`Other`）表記、キーボード操作・`motion-safe`・モバイル幅 Flexbox 折り返し
2. **[GitHub API・レート制限・セキュリティ チェックリスト (`references/github-api-security.md`)](references/github-api-security.md)**
   - レスポンス型防御、`total_count` と `per_page` の区別、`conclusion` 網羅性と再実行・キャンセル時の失敗保持、補助ルックアップの失敗通知とトークンスコープキャッシュ、In-flight リクエスト無効化、PAT 秘匿
3. **[テスト・ドキュメント整合性 チェックリスト (`references/testing-and-docs.md`)](references/testing-and-docs.md)**
   - テスト間のキャッシュ分離、UI アサーション強度、`storage.test.ts` 後方互換、`security.test.ts` 新 API カバレッジ、JSDoc（Docstring 80% 基準）、Markdownlint 空行ルール、設計ドキュメント同期

---

## 📋 実行手順

### 1. 変更差分の把握

現在の作業ツリーおよびトピックブランチと `main` ブランチの差分・変更ファイル一覧を確認します（未コミット変更も含めるため `git diff main` および `git status -s` を使用します）。

```powershell
git status -s
git diff --stat main
```

### 2. 独立レビューサブエージェント (`research`) の起動

実装者バイアスを排除するため、`invoke_subagent` で `research` サブエージェントを起動し、以下を指示します：

- `git diff main` の差分および変更・新規作成されたファイルを全文確認すること
- `.agents/skills/code-review/references/` 配下の 3 つのチェックリストファイルを読み込み、すべての項目に照らして検査すること
- 発見事項を重大度別（🔴 Critical / 🟠 Major / 🟡 Minor・Nitpick / ✅ 問題なし確認済み項目）に報告すること

### 3. 指摘事項の修正とローカル検証（修正依頼または PR 作成・Push 前の場合）

レビューのみの場合は作業ツリーを変更せず、指摘事項を報告します。
修正依頼または PR 作成・Push 前の場合は、修正すべき項目をローカルで修正し、**修正によって新たに追加したコード（エラーパス・フォールバック分岐・補助 API 呼び出し・JSDoc 等）がチェックリストの他項目に違反していないか再確認したうえで**、以下をすべて通過させます。

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. 変更ファイルの改行コードがすべて LF (`\n`) であることの確認

### 4. 結果報告（またはコミット・Push）

レビュー結果と修正内容をユーザーに報告します。PR 作成・更新フローの中で実行した場合は、すべての修正と検証が完了してから 1 回のコミット・`git push` にまとめて反映します。

---

## 🔄 継続的改善（CodeRabbit 等の外部レビュー指摘からの学習）

PR 作成後に CodeRabbit やユーザーから新たな観点のレビュー指摘を受けた場合は、コードの修正とあわせて **`references/` 配下の該当チェックリストファイルに再発防止のチェック項目を追記** してください。これにより、次回以降の `code-review` スキル実行時に同じパターンの指摘を未然に防ぐことができます。
