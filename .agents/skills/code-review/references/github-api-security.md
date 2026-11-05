# GitHub API・レート制限・セキュリティ レビューチェックリスト

`code-review` スキル実行時に確認する GitHub REST / GraphQL API 通信・キャッシュ・セキュリティのチェック項目です。
CodeRabbit 等で新たな指摘を受けた際は、再発防止のため本ファイルに項目を追記してください。

---

## 1. GitHub API レスポンス仕様と防御的パース

- [ ] **配列・オブジェクト構造の防御チェック**:
  - `data.workflow_runs`、`data.runners`、`repo.pullRequests.nodes` などの配列フィールドが存在しない・配列でない異常レスポンス時にクラッシュせず、適切に `warning` / `error` として扱われるか。
- [ ] **`total_count` と `per_page` の意味の区別**:
  - GitHub REST API の `total_count` は「リポジトリ全体の過去の累積総数」を返すため、`total_count > per_page` を「取得漏れエラー（`incompleteCoverage`）」と誤判定していないか。
- [ ] **GitHub Actions `conclusion` の網羅性と未解決失敗の保持**:
  - 失敗判定（`isWorkflowRunFailed` 等）において、`failure` だけでなく `timed_out`、`action_required`、`startup_failure`（YAML構文エラーやランナー割当失敗）を含めているか。
  - 後続の別 Run や再実行（`run_attempt > 1`）が `cancelled` / `skipped` / `neutral` / `stale` で完了した場合に、直前の未解決の失敗ステータスが誤って消去（`All Passed` 扱い）されないか。
  - 再実行（Rerun）された古い Run の失敗が新しい Run より後に実行された場合、`createdAt` ではなく最新試行の実行日時（`run_started_at` / `updated_at`）を基準に最新状態を判定しているか。
  - フォークからの PR トリガー等で `pull_requests[].number` が空の場合でも、`head_repository.full_name` をスコープキーに含めて別フォークの同名ブランチ（`main` 等）と衝突しないようにしているか。
- [ ] **URL パスパラメータのエンコード**:
  - `owner`、`repo`、`orgName` などを REST API URL に埋め込む際、`encodeURIComponent()` を使用しているか。

---

## 2. レート制限保護・キャッシュ管理

- [ ] **多数リポジトリ登録時のファンアウト抑制**:
  - リポジトリごとに個別 REST API を呼び出す機能では、最大取得リポジトリ数上限（例: 20件）や短時間 TTL キャッシュ（例: 20秒）、レート制限残数ガード（残り 100 未満時はスキップ）を設けているか。
- [ ] **上限スキップ時の通知**:
  - リポジトリ数上限やレート制限保護により一部取得をスキップした場合、無言で切り捨てず `warning` および `incompleteCoverage: true` を返してユーザーに通知しているか。
- [ ] **キャッシュのクリアタイミングと In-flight リクエストの無効化**:
  - モジュールスコープのキャッシュを設けた場合、手動更新ボタン押下時（`!isSilent`）、ログアウト時（`handleLogout`）、および PAT 変更時に古いキャッシュが残らないようクリアまたは PAT キー検証を行っているか。
  - キャッシュクリア時に世代番号（generation counter）等をインクリメントし、クリア前から進行中（in-flight）だった古いリクエストが後から完了してキャッシュを再汚染しないようにしているか。

---

## 3. Zero-Backend & PAT セキュリティ

- [ ] **通信先の厳格な制限**:
  - すべての API 通信が `https://api.github.com/` のみに対して行われているか（外部プロキシ等の不使用）。
- [ ] **PAT の秘匿**:
  - PAT が URL クエリパラメータやパス、コンソールログ（`console.log` / `warn` / `error`）に出力されず、`Authorization: Bearer` ヘッダーのみに格納されているか。

