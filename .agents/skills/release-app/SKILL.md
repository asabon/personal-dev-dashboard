---
name: release-app
description: Execute the release workflow for Personal Dev Dashboard. Use this skill when the user requests a release, wants to bump versions, create release notes, create a release PR, or publish a Pre-Release/Release.
---

# Release App Workflow (`release-app`)

This skill guides and executes the end-to-end release process for **Personal Dev Dashboard**.
It follows a 4-phase lifecycle: **Draft Inspection -> Release PR -> Pre-Release Tagging -> Deployment Verification**.

---

## 🧭 Release Lifecycle Overview

```
[Release Drafter (Draft: "Next release")]
                 │
                 ▼ (Step 1: Check Changes & Determine Version)
[Branch: release/vX.Y.Z & Bump package.json]
                 │
                 ▼ (Step 2: Create Release PR with --body-file)
[User Merges PR to main]
                 │
                 ▼ (Step 3: Create Tag & Pre-Release)
[GitHub Actions deploy.yml runs]
                 │
                 ▼ (Step 4: Deploy to GitHub Pages & Auto-promote to Release)
[Production Live & Release Published!]
```

---

## 📋 Step-by-Step Execution Guide

### Step 1: Draft Release の確認とバージョン決定

1. GitHub 上のドラフトリリース（"Next release"）の内容を取得します。
   ```bash
   gh api repos/:owner/:repo/releases | jq '.[] | select(.draft == true)'
   ```
2. ドラフトに含まれる変更点を確認し、Semantic Versioning (SemVer) に従って次期バージョンを決定します：
   - 破壊的変更がある場合: **Major** (`X+1.0.0`)
   - 新機能・UI改善がある場合: **Minor** (`X.Y+1.0`)
   - バグ修正・メンテ・ドキュメント更新のみの場合: **Patch** (`X.Y.Z+1`)
   - ※ユーザーから明示的なバージョン指定がある場合はそれを優先します。

---

### Step 2: リリース準備 PR の作成

1. トピックブランチ `release/vX.Y.Z` を作成します。
   ```bash
   git checkout -b release/vX.Y.Z
   ```
2. `package.json` の `version` を新しいバージョンに更新します。
3. リリースノートやドキュメント（必要に応じて `README.md` のロードマップなど）を更新します。
4. コミットを作成します。
   ```bash
   git add package.json README.md
   git commit -m "chore(release): prepare release vX.Y.Z"
   git push -u origin release/vX.Y.Z
   ```
5. **重要**: PR 本文は必ず一時ファイル経由（`--body-file`）で送信します。
   - ドラフトリリースの内容を一時 Markdown ファイル（`temp_pr_body.md`）に書き出し：
     ```bash
     gh pr create --title "chore(release): release vX.Y.Z" --body-file temp_pr_body.md
     Remove-Item "temp_pr_body.md"
     ```
6. PR 作成後、ユーザーへ差分の確認とマージを依頼します。

---

### Step 3: タグ打ち & Pre-Release 作成

ユーザーがリリース PR を `main` にマージしたことを確認したら：

1. ローカルの `main` を最新化します。
   ```bash
   git checkout main && git pull origin main
   ```
2. マージ済みブランチを削除します。
   ```bash
   git branch -d release/vX.Y.Z
   ```
3. GitHub CLI を使用して **Pre-Release** を作成します（これによりタグ `vX.Y.Z` も自動作成されます）。
   - リリースノート本文を一時ファイルに書き出してから実行：
     ```bash
     gh release create vX.Y.Z --title "vX.Y.Z" --notes-file temp_release_notes.md --prerelease
     Remove-Item "temp_release_notes.md"
     ```

---

### Step 4: デプロイ監視 & 正式 Release への自動昇格の確認

1. Pre-Release 作成により、自動的に `.github/workflows/deploy.yml` が起動します。
2. 実行状況を監視します。
   ```bash
   gh run list --workflow=deploy.yml -n 1
   ```
3. ワークフローが完了すると：
   - GitHub Pages への本番デプロイが完了します。
   - `deploy.yml` 内の `promote_to_release` ジョブによって、Pre-Release が自動的に **正式な Release（Latest）** に昇格します。
4. 正式公開されたことを確認し、ユーザーへ本番 URL（`https://<owner>.github.io/<repo>/`）を報告します。
