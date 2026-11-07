---
name: prepare-release
description: Prepare a release for Personal Dev Dashboard. Checks main CI, analyzes code/commit diffs since the previous tag to write release notes, updates package.json and CHANGELOG.md, creates a GitHub Draft Release, and opens a release PR.
---

# リリース準備スキル (`prepare-release`)

ユーザーから「リリースして」「リリース準備をして」「vX.Y.Z をリリースしたい」等の指示を受けた際に実行する手順です。
前回リリースタグからのコミット履歴およびコード差分を解析して高品質なリリースノートを生成し、[`CHANGELOG.md`](../../../CHANGELOG.md) と GitHub Draft Release の両方に反映します。

---

## 📋 実行手順

### 1. リリース前の状態確認 & 差分解析・バージョン決定

1. **`main` ブランチの最新化と CI 成功を確認**:
   ベースとなる `main` ブランチを最新化し、最新コミットに対する GitHub Actions (CI) が成功していることを確認します。

   ```powershell
   git switch main
   git pull origin main
   gh run list --branch main --workflow "CI" --limit 1
   ```

   - ステータスが `completed / success` であることを確認します。

2. **前回リリースタグからの差分解析**:
   直前のリリースタグを取得し、`HEAD` までのコミット一覧および変更差分を確認します。

   ```powershell
   $prevTag = git describe --tags --abbrev=0
   git log "$prevTag..HEAD" --oneline
   git diff --stat "$prevTag..HEAD"
   ```

3. **バージョン情報の決定**:
   - ユーザーからバージョン（例: `1.6.0`）が指定された場合はそのバージョンを使用します。
   - 指定がない場合は、`prevTag` からの変更規模（`feat:` 等の機能追加があればマイナーバージョン更新、`fix:` / `docs:` / `chore:` のみならパッチバージョン更新）に基づいて決定します。

4. **トピックブランチの作成**:

   ```powershell
   git switch -c chore/release-vX.Y.Z
   ```

---

### 2. リリースノート作成・`CHANGELOG.md` & `package.json` 更新・Draft Release 作成

1. **リリースノート本文の作成**:
   - PR タイトルの単純な羅列ではなく、コミット履歴とコード差分から **「何が追加・改善・修正されたのか」が利用者・開発者に一目で伝わる要約** をカテゴリ別（`### 🚀 新機能 / Features`、`### 🐛 バグ修正・改善 / Bug Fixes & Improvements`、`### 📖 ドキュメント・開発基盤 / Documentation & Developer Experience` 等）に作成します。
   - リリース作業自体のコミット（`chore: リリース vX.Y.Z`）はリリースノートに含めません。

2. **`package.json` と `CHANGELOG.md` の更新**:
   - [`package.json`](../../../package.json) の `version` フィールドを決定したバージョン（例: `"1.6.0"`）に更新します。
   - [`CHANGELOG.md`](../../../CHANGELOG.md) の導入文の下の `---` の直後（既存バージョンの最上部）に `## [vX.Y.Z] - YYYY-MM-DD` セクションを追加してリリースノートを記載し、セクション末尾を `---` で区切ります（GitHub Releases へ転記した際に 404 にならないよう、ファイル参照は相対リンクではなく `` `docs/dev/...` `` のようなインラインコード表記とします）。

3. **GitHub Draft Release の作成（または更新）**:
   - `CHANGELOG.md` に記載した今回分のリリースノート本文を `scratch/release_notes.md`（先頭に `## 変更内容 / What's Changed` を付与）に書き出し、既存のドラフトがあれば Release ID で削除した上で、新しいドラフトを作成します。

   ```powershell
   $draftIds = gh api repos/:owner/:repo/releases --jq '.[] | select(.draft == true) | .id'
   foreach ($id in $draftIds) {
     if ($id) { gh api -X DELETE "repos/:owner/:repo/releases/$id" }
   }
   gh release create "vX.Y.Z" --draft --title "vX.Y.Z" --notes-file "scratch/release_notes.md"
   Remove-Item "scratch/release_notes.md" -Force
   ```

4. **事前検証・LF 確認 & コミット作成**:
   - `npm run typecheck` / `npm test` / `npm run build` の通過、[`code-review`](../code-review/SKILL.md) スキルによる事前点検、および `package.json`・`CHANGELOG.md` の改行コードが LF (`\n`) であることを確認してコミットします。

   ```powershell
   npm run typecheck
   npm test
   npm run build
   git add package.json CHANGELOG.md
   git commit -m "chore: リリース vX.Y.Z に向けたバージョン・CHANGELOG更新"
   ```

---

### 3. Pull Request の作成

1. **ブランチをリモートへ push**:

   ```powershell
   git push -u origin chore/release-vX.Y.Z
   ```

2. **GitHub CLI で PR を作成 (`--body-file` 必須)**:
   - `scratch/pr_body.md` にリリースノート全文と確認事項を記載し、PR を作成します。

   ```powershell
   gh pr create --title "chore: リリース vX.Y.Z" --body-file "scratch/pr_body.md" --base main
   Remove-Item "scratch/pr_body.md" -Force
   gh pr checks --watch
   ```

3. **ユーザーへの報告 & レビュー依頼**:
   - CI の通過を確認後、PR URL を案内し、`CHANGELOG.md` のリリースノート文面確認および `main` へのマージを依頼します。
   - ※PR レビューで `CHANGELOG.md` の文面修正を指示された場合は、`CHANGELOG.md` を修正して Push するとともに、GitHub 上の Draft Release の本文も同じ内容に更新してください。

---

## ⏩ 次のステップ案内

PR がマージされたら、タグ付けと本番公開を行う [`publish-release`](../publish-release/SKILL.md) スキルを実行することをユーザーに案内してください。
