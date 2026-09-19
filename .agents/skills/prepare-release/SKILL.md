---
name: prepare-release
description: Prepare a release for Personal Dev Dashboard. Checks main CI, determines version, bumps package.json, and creates a release PR with notes from Release Drafter.
---

# リリース準備スキル (`prepare-release`)

ユーザーから「リリースして」「リリース準備をして」「vX.Y.Z をリリースしたい」等の指示を受けた際に実行する手順です。
IntervalTimer プロジェクトのリリース準備パイプラインに準拠しています。

---

## 📋 実行手順

### 1. リリース前の状態確認 & バージョン決定

1. **`main` の CI 成功を確認**:
   ベースとなる `main` ブランチの最新コミットに対する GitHub Actions (CI) が成功していることを確認します。
   ```bash
   gh run list --branch main --workflow "CI" --limit 1
   ```
   - ステータスが `completed / success` であることを確認（失敗または実行中の場合は結果を待つか原因を確認）。

2. **バージョン情報の決定**:
   - ユーザーからバージョン（例: `0.2.0`）が指定された場合はそのバージョンを使用。
   - バージョンが明示されていない場合は、直前のリリース（`gh release list` の Latest Release）および `Next Release` ドラフトに含まれる変更規模（機能追加ならマイナー、修正・保守ならパッチ）を考慮して提案・決定。

3. **トピックブランチの作成**:
   ```bash
   git switch main
   git pull origin main
   git switch -c chore/release-vX.Y.Z
   ```

---

### 2. 設定・更新情報ファイルの更新 & コミット

1. **`package.json` の更新**:
   - `version` フィールドを決定したバージョン（例: `"0.2.0"`）に更新。
2. **Next Release ドラフトの確認**:
   - GitHub Releases 上の `Next Release` ドラフトの内容を確認し、PR 本文およびリリースノートに反映する準備をします。
   ```bash
   gh api repos/:owner/:repo/releases | jq '.[] | select(.draft == true)'
   ```
3. **コミット作成**:
   ```bash
   git add package.json
   git commit -m "chore: リリース vX.Y.Z に向けたバージョン更新"
   ```

---

### 3. Pull Request の作成

1. **ブランチをリモートへ push**:
   ```bash
   git push -u origin chore/release-vX.Y.Z
   ```
2. **PR の本文（PR Body）を作成**:
   - 一時 Markdown ファイル（`temp_pr_body.md`）に、変更内容（What's Changed）や確認事項を記載。
3. **GitHub CLI で PR を作成 (`--body-file` 必須)**:
   ```bash
   gh pr create --title "[Chore] リリース vX.Y.Z" --body-file "temp_pr_body.md" --label "chore" --base main
   Remove-Item "temp_pr_body.md"
   ```
4. **ユーザーへの報告 & レビュー依頼**:
   - PR URL を案内し、リリースノートの文言確認および `main` へのマージを依頼します。

---

## ⏩ 次のステップ案内

PR がマージされたら、タグ付けと Pre-Release 作成を行う `promote-release` スキルを実行することをユーザーに案内してください。
