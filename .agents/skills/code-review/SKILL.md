---
name: code-review
description: Perform a comprehensive CodeRabbit-equivalent code review on current branch/working-tree changes against main, before git push/PR creation or on demand.
---

# コードレビュースキル (`code-review`)

実装中の変更（未コミット変更を含む）やトピックブランチ全体の差分に対して、独立した視点で CodeRabbit 相当のコードレビューを実施するスキルです。
コミット前・PR 作成前・Push 前の事前点検、およびユーザーから「コードレビューして」と依頼された際に使用します。

---

## 🧠 レビューの基本原則（チェックリスト固着の防止）

AI モデルの進化に伴い、モデルの推論能力を 100% 発揮させるため、本スキルでは **「2段階レビュー方式（ゼロベース深掘り推論 → プロジェクト固有ベースライン照合）」** を採用します。

- **チェックリストは「最低限のベースライン」であり「思考の上限」ではない**:
  - 最初からチェックリストを見ながらコードを読むと、リスト項目を確認するだけの「作業モード（視野狭窄・アンカリング）」に陥り、未知のロジック破綻やエッジケースを見落とします。
  - 必ず **Stage 1（チェックリストを見ない自由推論）** を先に実施し、その後に **Stage 2（プロジェクト固有規約・既知トラップの照合）** を行ってください。

---

## 📚 プロジェクト固有ベースライン (`references/`)

Stage 2 で参照する、本リポジトリ固有の UI 規約・GitHub API の仕様上の罠・過去の再発防止チェックリストです：

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

### 2. 独立レビューサブエージェント (`research`) の起動（2段階レビュー）

実装者バイアスとチェックリスト固着（アンカリング）の両方を排除するため、`invoke_subagent` で `research` サブエージェントを起動し、**必ず以下の順序（Stage 1 → Stage 2）** でレビューするよう指示します：

1. **Stage 1: オープンエンドな深掘りレビュー（チェックリスト参照前）**
   - **まだ `references/` のチェックリストを読まずに**、`git diff main` の差分および変更・新規作成されたファイルの全文（必要に応じて呼び出し元・型定義等の周辺コード）を読むこと。
   - モデル自身の最大限の推論能力を使い、先入観なしで以下を徹底的に洗い出すこと：
     - ロジックの破綻、境界値・エッジケースの考慮漏れ、データ不整合
     - 非同期処理の競合（Race Condition）、状態遷移の不備、メモリリーク・キャッシュ不整合
     - アーキテクチャや既存コードベースとの設計上の不整合、セキュリティ・パフォーマンス上の懸念
     - テストケースの抜け漏れやアサーションの不十分さ
2. **Stage 2: プロジェクト固有ベースライン（`references/`）の照合**
   - Stage 1 の洗い出しが完了した後に、`.agents/skills/code-review/references/` 配下の 3 つのチェックリストファイルを読み込むこと。
   - リポジトリ固有の UI ルール、GitHub API の仕様上の罠、CodeRabbit の基準（Docstring 等）に照らして見落としがないか検査すること。
3. **統合レポートの作成**
   - Stage 1（自由推論による発見）と Stage 2（固有ベースライン照合）の結果を統合し、重大度別（🔴 Critical / 🟠 Major / 🟡 Minor・Nitpick / ✅ 問題なし確認済み項目）に報告すること。

### 3. 指摘事項の修正とローカル検証（修正依頼または PR 作成・Push 前の場合）

レビューのみの場合は作業ツリーを変更せず、指摘事項を報告します。
修正依頼または PR 作成・Push 前の場合は、修正すべき項目をローカルで修正し、**修正によって新たに追加したコード（エラーパス・フォールバック分岐・補助 API 呼び出し・JSDoc 等）が新たなバグや固有ルール違反を生んでいないか再確認したうえで**、以下をすべて通過させます。

1. `npm run typecheck`
2. `npm test`
3. `npm run build`
4. 変更ファイルの改行コードがすべて LF (`\n`) であることの確認

### 4. 結果報告（またはコミット・Push）

レビュー結果と修正内容をユーザーに報告します。PR 作成・更新フローの中で実行した場合は、すべての修正と検証が完了してから 1 回のコミット・`git push` にまとめて反映します。

---

## 🔄 継続的改善とチェックリストの肥大化防止（棚卸し原則）

PR 作成後に CodeRabbit やユーザーから新たな観点のレビュー指摘を受けた場合は、スキル [`address-review-comments`](../address-review-comments/SKILL.md) に従って対応します。
ただし、チェックリストの肥大化による Attention 分散（モデルの推論力低下）を防ぐため、`references/` への追記時は以下の基準を厳守してください：

- **追記すべきもの（プロジェクト固有・ドメイン固有の知見）**:
  - コード片だけでは判断できない本プロジェクト固有の UI/UX ルール、アーキテクチャ制約、GitHub API 固有の非自明な仕様、CodeRabbit の Pre-merge チェック基準。
- **追記しないもの（一般的なプログラミング知識）**:
  - 単純な typo、一般的な null チェック、標準的な TypeScript の型エラーなど、モデルが Stage 1 の自由推論で自然に検出できる汎用的な事柄。
- **統合と抽象化**:
  - 類似の観点がある場合は新規項目を増やさず既存項目に統合し、常に簡潔・高密度な状態を保つこと。
