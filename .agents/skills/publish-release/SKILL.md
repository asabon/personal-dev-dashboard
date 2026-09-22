---
name: publish-release
description: Publish a new release for Personal Dev Dashboard. Pushes the release tag, monitors GitHub Actions deployment, and verifies the published Release on GitHub.
---

# リリース公開スキル (`publish-release`)

ユーザーから「リリース PR をマージしました」「公開してください」と連絡を受けた際に実行する手順です。

---

## 📋 実行手順

### 1. ローカル main の最新化 & トピックブランチの削除

```bash
git switch main
git pull origin main
git fetch --prune
git branch -d chore/release-vX.Y.Z
```

---

### 2. リリースタグの作成 & push

1. `package.json` に記載されているバージョン番号を確認します：
   ```bash
   node -p "require('./package.json').version"
   ```
2. 対応するタグ（例: `v0.2.0`）を作成し、リモートへ push します：
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

---

### 3. デプロイ & リリース自動公開の監視

タグが push されると、GitHub Actions の **`Deploy to GitHub Pages`** ワークフローが自動起動します。

1. ワークフローの実行状況を確認します：
   ```bash
   gh run list --workflow="Deploy to GitHub Pages" --limit 1
   ```
2. ワークフローの内部動作：
   - **`deploy` ジョブ**: 本番ビルドを実行し、GitHub Pages へデプロイします。
   - **`publish_release` ジョブ**: デプロイが成功すると、Release Drafter が溜めていた **"Next Release" ドラフトを正式な Release (`vX.Y.Z`) として自動公開** します。
3. デプロイ完了後、ユーザーへ以下を案内して完了とします：
   - 本番サイト URL: `https://asabon.github.io/personal-dev-dashboard/`
   - GitHub Release ページ URL: `https://github.com/asabon/personal-dev-dashboard/releases/tag/vX.Y.Z`
