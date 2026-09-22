# Personal Dev Dashboard 🚀

> 個人開発者のための **GitHub Actions 無料枠使用量 & 複数リポジトリ PR × CI 統合ダッシュボード**

[![CI](https://github.com/asabon/personal-dev-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/asabon/personal-dev-dashboard/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/asabon/personal-dev-dashboard)](https://github.com/asabon/personal-dev-dashboard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 💡 概要 (Overview)

個人開発で複数のリポジトリを並行して動かしていると、以下のような不便が生じがちです：

- **「今月 Actions の無料枠（2,000分）をどれくらい消費したか」** を確認するために設定の課金画面まで潜る必要がある
- 各リポジトリの **「どの PR の CI が動いていて、どれが落ちたか」** を 1 画面でパッと一覧できない
- 自前で動かしている **セルフホステッドランナー（Self-Hosted Runner）** が今動いているのかオフラインなのか分からない

**Personal Dev Dashboard** は、これらの情報をブラウザ 1 画面でリアルタイムに俯瞰できる、**完全クライアント完結型 (Zero-Backend SPA)** のダッシュボードです。

```text
+-----------------------------------------------------------------------------------+
|  [Logo] Personal Dev Dashboard       [残りAPI: 4920] [最終更新: 12:30] [🔄更新] [⚙️]  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  ■ Actions 無料枠使用状況 (今月)                            [ 順調 (目安内) ]     |
|  当月の使用量: 550 / 2,000 分 (28%)                 残り無料枠: 1,450 分 (枠の 72%)|
|  [=======>------------------------]                                               |
|  0 分                   ▲ 本日目安: 667 分 (33%)                         2,000 分 |
|  ・Ubuntu: 550 分  ・macOS: 0 分  ・Windows: 0 分                                 |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  ■ 監視リポジトリ一覧 (+ リポジトリ追加)                                            |
|  ▼ owner/frontend (Open PR: 2)                                                    |
|  | #42 feat: Add OAuth login flow                   [ CI: 失敗 ❌ ]  [👤 alice]   |
|  | #39 fix: Button alignment                        [ CI: 成功 ✅ ]  [👤 bob]     |
|                                                                                   |
|  ■ セルフホステッドランナー (任意表示)                                             |
|  | [🟢 online] gpu-runner-01  |  [🟡 busy] m2-mac-mini  |  [🔴 offline] ci-box-02 |
+-----------------------------------------------------------------------------------+
```

---

## ✨ 主な特徴 (Features)

- **⚡ 完全クライアント完結 (Zero-Backend / BYOK)**:
  - 外部バックエンドサーバーやプロキシ API は一切不要。静的配信（GitHub Pages）だけで動作します。
- **📊 GitHub Actions 無料枠の可視化 & ペース判定**:
  - 当月の使用量と残り枠を対比して分かりやすく表示。
  - 当日の暦日進捗に応じた「本日目安」インジケーターと、消費ペース判定（`順調` / `やや速い` / `ハイペース` / `残り僅か`）を自動表示。
  - OS 別（Ubuntu / macOS / Windows）の消費内訳も確認可能。
- **🔍 複数リポジトリの PR & CI 統合ビュー**:
  - 監視対象リポジトリの Open な Pull Request と CI チェック結果（Check Runs）を 1 画面に集約。
  - 失敗したチェックの詳細ログへワンクリックでジャンプ可能。
- **🖥️ セルフホステッドランナー監視 (任意)**:
  - リポジトリまたは Organization の Self-Hosted Runners の稼働状況（online / busy / offline）を一覧表示。
- **🎨 開発者向けモダンダークテーマ**:
  - サブモニターやデスクトップの片隅に常時表示しやすい、洗練されたダークテーマ UI。

---

## 🔒 セキュリティ & プライバシー (Security)

本アプリケーションは、ユーザーの機密情報（Personal Access Token）を最高レベルで保護するよう設計されています：

1. **トークンはブラウザ内にのみ保存**:
   - 入力された PAT はお使いのブラウザの `localStorage` にのみ保存され、外部のバックエンドサーバーには一切送信されません。
2. **ブラウザネイティブの強制遮断 (CSP: Content Security Policy)**:
   - `index.html` に厳格な CSP を設定しており、ブラウザ自身が **`https://api.github.com/` 以外の未知のドメインへの通信を物理的に遮断** します。
3. **自動テストによる安全性保証**:
   - すべての通信先が公式 GitHub API のみであること、URL パスや Cookie 等へトークンが漏洩しないことを **CI 自動テスト（Vitest）で常時検証** しています。

---

## 🌐 今すぐ使う (Live Demo) & 🚀 はじめかた (Quick Start)

👉 **[https://asabon.github.io/personal-dev-dashboard/](https://asabon.github.io/personal-dev-dashboard/)**

インストール不要で、ブラウザから 3 ステップですぐに利用できます：

### Step 1: GitHub Personal Access Token (PAT) を取得
- 最も手軽なのは **[Classic PAT（スコープ自動選択リンク）](https://github.com/settings/tokens/new?scopes=repo,user&description=Personal%20Dev%20Dashboard)** からの発行です。
  - 必要な権限（`repo`, `user`）が自動で選択されています。画面下部の「Generate token」をクリックしてトークン文字列（`ghp_...`）をコピーしてください。
  - ※セルフホステッドランナーを監視する場合は、追加で `manage_runners:org`（またはリポジトリの管理者権限）が必要です。
  - 詳細ガイド: [**🔑 GitHub PAT 作成・設定ガイド (docs/user/setup-pat.md)**](docs/user/setup-pat.md)

### Step 2: ダッシュボードを開いてトークンを入力
- [**Personal Dev Dashboard**](https://asabon.github.io/personal-dev-dashboard/) をブラウザで開きます。
- 初回モーダルにコピーした PAT を貼り付け、「利用を開始する」をクリックします。

### Step 3: 監視したいリポジトリを登録
- 「リポジトリ追加」ボタンから、監視したいリポジトリ（例: `owner/repo`）を入力して追加します。

---

## 🛠 ローカル開発 & テスト (Development)

```bash
# リポジトリのクローン & 依存関係のインストール
git clone https://github.com/asabon/personal-dev-dashboard.git
cd personal-dev-dashboard
npm install

# ローカル開発サーバーの起動 (http://localhost:5173/)
npm run dev

# 単体テスト & セキュリティテストの実行 (Vitest)
npm test

# 型チェック & プロダクションビルド
npm run typecheck
npm run build
```

---

## 📚 ドキュメント (Documentation)

### 👤 利用者向けガイド
- 🔑 [**GitHub PAT 作成・設定ガイド (docs/user/setup-pat.md)**](docs/user/setup-pat.md)  
  Classic / Fine-grained PAT の詳しい発行手順、必要な権限、トラブルシューティング

### 🛠 開発・設計ドキュメント
設計の詳細は [`docs/dev/`](docs/dev/) 配下に整理されています：

- 🏛️ [**システムアーキテクチャ (docs/dev/architecture.md)**](docs/dev/architecture.md): クライアント完結型設計、セキュリティとトークン管理、技術選定
- 📡 [**GitHub API 設計 (docs/dev/api-design.md)**](docs/dev/api-design.md): REST と GraphQL による効率的なデータ取得とレート制限対策
- 🧩 [**データモデル (docs/dev/data-model.md)**](docs/dev/data-model.md): ローカル設定・キャッシュ構造、TypeScript 型定義
- 🖥️ [**UI / UX 設計 (docs/dev/ui-design.md)**](docs/dev/ui-design.md): 画面レイアウト、コンポーネント構成、オンボーディング導線
- 🧪 [**テスト方針 & テスト観点仕様書 (docs/dev/testing.md)**](docs/dev/testing.md): Vitest テスト設計、セキュリティ・ロジック・UI の検証項目
- 🚀 [**開発・リリース運用ガイド (docs/dev/release-flow.md)**](docs/dev/release-flow.md): ブランチ戦略、リリース自動公開、CI/CD 設計
- 🗺️ [**開発ロードマップ & 実装実績 (docs/dev/roadmap.md)**](docs/dev/roadmap.md): 開発実績、マイルストーン、今後の拡張アイデア

---

## 🛠 技術スタック (Tech Stack)

- **Frontend**: React 19 / TypeScript (Strict) / Vite
- **Styling**: Tailwind CSS v4 / Lucide Icons
- **Testing**: Vitest / React Testing Library / jsdom
- **Deployment**: GitHub Pages (via GitHub Actions)
- **License**: [MIT](LICENSE)
