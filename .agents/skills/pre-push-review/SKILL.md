---
name: pre-push-review
description: Perform a comprehensive CodeRabbit-equivalent code review before git push or PR creation, or on demand when requested by the user.
---

# Push 前コードレビュースキル (`pre-push-review`)

CodeRabbit のレート制限を消費せずに高品質な PR を作成・更新するため、`git push` 前やユーザーから「レビューして」「CodeRabbit 相当のチェックをして」と依頼された際に実行するスキルです。

---

## 📋 実行手順

### 1. 変更差分の把握
現在のトピックブランチと `main` ブランチの差分および変更ファイル一覧を確認します。
```powershell
git status -s
git diff --stat main...HEAD
```

### 2. 独立レビューサブエージェント (`research`) の起動
実装者バイアスを排除するため、`invoke_subagent` で `research` サブエージェントを起動し、変更されたすべてのファイルを `.agents/rules/pre-push-review.md` のチェックリストに基づいて精査させます。

サブエージェントへの指示例：
- 変更されたソースコード・テスト・ドキュメントを全文確認すること
- 状態遷移（`isLoading`, `error`, `warning`, 空状態）、集約キーの衝突、モジュールキャッシュのテスト間干渉、GitHub API のレスポンス型防御、モバイル幅の Flexbox 折り返し、テストケースの網羅性、ドキュメント整合性を重点検査すること
- 発見事項を重大度別（🔴 Critical / 🟠 Major / 🟡 Minor・Nitpick）に報告すること

### 3. 指摘事項の修正とローカル検証
サブエージェントから報告された指摘事項のうち、修正すべき項目をすべてローカルで修正し、以下をすべて通過させます。
1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. 変更ファイルの改行コードがすべて LF (`\n`) であることの確認

### 4. まとめ Push / 結果報告
すべての修正と検証が完了してから、1 回のコミット・`git push` にまとめて反映し、レビュー結果と対応内容をユーザーに報告します。

