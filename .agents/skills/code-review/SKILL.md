---
name: code-review
description: Perform a comprehensive CodeRabbit-equivalent code review on current branch/working-tree changes against main, before git push/PR creation or on demand.
---

# コードレビュースキル (`code-review`)

実装中の変更（未コミット変更を含む）やトピックブランチ全体の差分に対して、独立した視点で CodeRabbit 相当のコードレビューを実施するスキルです。
コミット前・PR 作成前・Push 前の事前点検、およびユーザーから「コードレビューして」と依頼された際に使用します。

---

## 📋 実行手順

### 1. 変更差分の把握
現在の作業ツリーおよびトピックブランチと `main` ブランチの差分・変更ファイル一覧を確認します（未コミット変更も含めるため `git diff main` および `git status -s` を使用します）。
```powershell
git status -s
git diff --stat main
```

### 2. 独立レビューサブエージェント (`research`) の起動
実装者バイアスを排除するため、`invoke_subagent` で `research` サブエージェントを起動し、変更されたすべてのファイル（未追跡の新規ファイルを含む）を [`.agents/rules/code-review.md`](../../rules/code-review.md) のチェックリストに基づいて精査させます。

サブエージェントへの指示例：
- `git diff main` の差分および変更・新規作成されたソースコード・テスト・ドキュメントを全文確認すること
- 状態遷移（`isLoading`, `isSilent`, `error`, `warning`, 空状態）、集約キーの衝突、モジュールキャッシュのテスト間干渉、GitHub API のレスポンス型防御と `conclusion` 網羅性、モバイル幅の Flexbox 折り返し、テストケースのアサーション強度、ドキュメント整合性を重点検査すること
- 発見事項を重大度別（🔴 Critical / 🟠 Major / 🟡 Minor・Nitpick / ✅ 問題なし確認済み項目）に報告すること

### 3. 指摘事項の修正とローカル検証
サブエージェントから報告された指摘事項のうち、修正すべき項目をローカルで修正し、以下をすべて通過させます。
1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. 変更ファイルの改行コードがすべて LF (`\n`) であることの確認

### 4. 結果報告（またはコミット・Push）
レビュー結果と修正内容をユーザーに報告します。PR 作成・更新フローの中で実行した場合は、すべての修正と検証が完了してから 1 回のコミット・`git push` にまとめて反映します。
