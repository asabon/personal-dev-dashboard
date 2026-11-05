# TypeScript / React / UI レビューチェックリスト

`code-review` スキル実行時に確認する TypeScript・React コンポーネント・Tailwind CSS レイアウトのチェック項目です。
CodeRabbit 等で新たな指摘を受けた際は、再発防止のため本ファイルに項目を追記してください。

---

## 1. 状態遷移・初期ロード・自動更新の整合性

- [ ] **初回ロード中（`isLoading=true`）の正常バッジ誤表示防止**:
  - データがまだ未取得で空配列（`[]`）のときに、`All Passed` や `0 PR`、`異常なし` などの「正常完了バッジ」がヘッダーやサマリーに表示されないか。
- [ ] **バックグラウンド自動更新（`isSilent=true`）時のちらつき防止**:
  - 定期ポーリング更新時に毎回 `isLoading: true` になって既存カード一覧がアンマウント（スピナー表示やアコーディオン開閉状態のリセット）されないか。既存データ保持時は `isLoading: false` を維持しているか。
- [ ] **部分失敗・警告（`warning` / `incompleteCoverage`）時の表示**:
  - 一部リポジトリや Organization の取得が失敗・スキップされた際、取得できた分だけで `All Passed` と表示していないか。
  - カード内のエラー/警告状態と、上部 `DashboardSummaryBar` の `FeatureAlert`（デバッグモードの `error` シナリオ含む）が一致しているか。
- [ ] **空状態（Empty State）とエラー状態の優先順位**:
  - 「0件のリポジトリは非表示」などのフィルタで、`error` を持つリポジトリまで非表示になっていないか（`pullRequests.length > 0 || Boolean(repo.error)`）。
  - 赤いエラーバナーの直下に、緑チェックマーク付きで「現在、失敗状態の項目はありません」という空状態メッセージが重複表示されないか。

---

## 2. 集約・ソート・データ変換ロジック

- [ ] **Map / Set 集約キーの衝突防止**:
  - 複数フィールドを文字列結合してキーを作る際、異なる属性値同士が衝突しないよう一意な ID（`workflowId ?? workflowName`）やスコーププレフィックス（`pr:${headBranch}` vs `workflow-latest`）を付与しているか。
- [ ] **進行中（Active / `in_progress`）状態の保護**:
  - 「同一ワークフローの最新実行のみを採用する」集約処理において、長時間実行中の古い `in_progress` Run が、後から開始して先に完了した `success` Run によって上書き・隠蔽されないか。
- [ ] **サマリーバッジの個数表示と `All` 表記の整合性**:
  - 状態別個数バッジ（`Running`, `Failed`, `Passed` 等）を並記する際、すべてのアイテムが正常完了しているときのみ `All ...`（`All Passed`, `All Online`, `All 目安以下`）を表示し、一部が異なる状態のときは各状態の個数バッジ（0件は非表示、`No CI` 等のその他状態も含む）を色固定で並記しているか。
- [ ] **Feature Module 契約の遵守**:
  - 任意カード追加・変更時に `src/App.tsx` や `src/components/SettingsModal.tsx`、`src/features/registry.ts` に機能固有の分岐を追加していないか。

---

## 3. レスポンシブ UI・Tailwind CSS レイアウト

- [ ] **モバイル幅（`sm:` 未満・360px幅）での横あふれ防止**:
  - `flex-wrap` コンテナ内の子要素に不要な `shrink-0` が付いて折り返しを阻害していないか。
  - ヘッダー右側のサマリーバッジ群など、複数バッジ（エラー＋Running＋Failed 等）が同時に並びうるコンテナに `flex-wrap` が指定されているか。
  - 可変長テキスト（リポジトリ名、ブランチ名、PR/Run タイトル）の親要素に `min-w-0`、テキスト要素に `truncate` または `break-all` が適切に設定されているか。

