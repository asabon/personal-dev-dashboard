---
name: promote-release
description: Publish tags, create Pre-Release, monitor deployment, and verify promotion to full Release for Personal Dev Dashboard.
---

# リリース公開・昇格スキル (`promote-release`)

ユーザーから「リリース PR をマージしました」と連絡を受けた後の手順です。
IntervalTimer プロジェクトのタグ発行・Pre-Release 昇格フローに準拠しています。

---

## 📋 実行手順

### 1. ローカル main の最新化 & クリーンアップ

1. `main` ブランチに切り替えて最新コミットを取得し、不要になったトピックブランチを削除します。
   ```bash
   git switch main
   git pull origin main
   git branch -d chore/release-vX.Y.Z
   ```

---

### 2. リリースタグの作成 & Pre-Release の発行

1. リリースタグを作成・push します：
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
2. **Release Drafter との連動**:
   - `Next Release` として蓄積されていたドラフトを、今回のタグ名（`vX.Y.Z`）を付与して **Pre-Release** として公開します。
   ```bash
   # ドラフトリリースの ID を取得して Pre-Release として公開
   gh release edit next-release --tag "vX.Y.Z" --title "vX.Y.Z" --prerelease
   ```
   ※もしドラフトが存在しない場合は新規に作成：
   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --generate-notes --prerelease
   ```

---

### 3. デプロイの監視 & 正式 Release への自動昇格

1. タグ push / Pre-Release 作成により、GitHub Actions の **`Deploy to GitHub Pages`** ワークフローが自動起動します。
2. ワークフローの進行状況を確認します：
   ```bash
   gh run list --workflow="Deploy to GitHub Pages" --limit 1
   ```
3. **ワークフロー完了後の状態確認**:
   - `build_and_deploy` ジョブ: 本番ビルド & GitHub Pages デプロイ
   - `promote_to_release` ジョブ: デプロイ成功時に、Pre-Release を自動的に **正式な Release（Latest）** へ昇格
4. **ユーザーへの完了報告**:
   - 本番 URL（`https://asabon.github.io/personal-dev-dashboard/`）および GitHub Release の URL をユーザーへ案内します。
