# Personal Dev Dashboard 🚀

> 個人開発者のための **GitHub Actions 使用状況 & 複数リポジトリ PR × CI 統合ダッシュボード**

[![CI](https://github.com/asabon/personal-dev-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/asabon/personal-dev-dashboard/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/asabon/personal-dev-dashboard)](https://github.com/asabon/personal-dev-dashboard/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 💡 概要 (Overview)

個人開発で複数のリポジトリを並行して動かしていると、以下のような不便が生じがちです：

- **「今月 Actions をどれくらい稼働・消費させたか」** を確認するために設定の課金画面まで潜る必要がある
- 各リポジトリの **「どの PR の CI が動いていて、どれが落ちたか」** を 1 画面でパッと一覧できない
- 自前で動かしている **セルフホステッドランナー（Self-Hosted Runner）** が今動いているのかオフラインなのか分からない

**Personal Dev Dashboard** は、これらの情報をブラウザ 1 画面でリアルタイムに俯瞰できる、**完全クライアント完結型 (Zero-Backend SPA)** のダッシュボードです。

### 🪟 幅狭ウィンドウ（PC常駐監視・スマホ）表示

IDE やメインブラウザの隣に「細長いウィンドウ」を独立常駐させる使い方に最適化されています。  
アコーディオン最小構成（簡易表示モード）により、サブモニターの片隅や画面端でも邪魔にならず、1 画面でリアルタイムに常時監視できます。

<p align="center">
  <img src="docs/assets/dashboard-mobile-preview.png" alt="Personal Dev Dashboard - 幅狭ウィンドウ (常駐監視)" width="360" />
  <br />
  <sub>PC画面端の独立ウィンドウや、スマートフォン（360px〜）にすっきり収まる最小構成</sub>
</p>

### 🖥️ ワイドデスクトップ表示（簡易表示モード）

サブモニター全画面などで広々と一覧したいときのスタイルです。普段は全カードがコンパクトに折りたたまれており、気になるカードだけをクリックして個別に展開・確認できます。

<p align="center">
  <img src="docs/assets/dashboard-compact-preview.png" alt="Personal Dev Dashboard - PCワイド版 (簡易表示モード)" width="900" />
</p>

<details>
<summary>🔍 <b>全カード展開時の「詳細モード」画面を見る（クリックで展開）</b></summary>

<br />

各リポジトリの PR やジョブ詳細、OS 別 Actions 内訳などを 1 画面ですべて展開して深掘り確認したいときのモードです（画面右上のトグルでワンクリック切り替え可能）。

<p align="center">
  <img src="docs/assets/dashboard-preview.png" alt="Personal Dev Dashboard - PC版 (詳細モード)" width="900" />
</p>

</details>

---

## ✨ 主な特徴 (Features)

- **⚡ 完全クライアント完結 (Zero-Backend / BYOK)**:
  - 外部バックエンドサーバーやプロキシ API は一切不要。静的配信（GitHub Pages）だけで安全に動作します。
- **🚨 状況サマリーバー (Dashboard Highlights)**:
  - 画面最上部に異常（CI 失敗、Actions 枠の警戒、Runner 停止）や実行中ジョブの要約を集約表示。
  - クリックまたはタップで該当カードへ即座にスムーズスクロール。
- **🪟 幅狭ウィンドウ常時監視 & 簡易表示モード (Compact View)**:
  - ヘッダーのトグルボタンで「詳細モード」と「簡易表示モード（アコーディオン折りたたみ）」をワンクリック切り替え。
  - IDE やブラウザ横に置く細長い独立ウィンドウ（幅 1024px 未満で自動切替）やスマートフォン（360px〜）でも、ヘッダーが美しく折り返され、文字切れのない快適な常時監視を実現。
- **📊 GitHub Actions 使用状況の常時並列表示 & 残量ファースト**:
  - 個人（Personal）および全監視 Organization の Actions 使用状況を、タブ切り替え不要で常時並列表示。
  - 各アカウントの残り無料枠をタイトルのすぐ横（スマホでは見やすい縦並びリスト）に常時掲示。
  - 月間クォータ（2,000分等）を基準に、当月の使用量（換算目安）と残り無料枠を直感的に可視化。
  - OS ごとの消費倍率（**Ubuntu: 1倍、macOS: 10倍、Windows: 2倍**）を自動適用して無料枠換算消費量を算出。
  - 当日の暦日進捗に応じた「本日目安」インジケーターと、消費ペース判定（`順調` / `やや速い` / `ハイペース` / `残り僅か`）を自動表示。
  - OS 別（Ubuntu / macOS / Windows）の実稼働時間内訳も確認可能。

> [!IMPORTANT]
> **GitHub Actions 使用量の集計仕様（制約事項）について**  
> 本アプリケーションが表示する Actions 使用量は、GitHub 公式 API（`billing/usage/summary`）から取得した **「パブリックおよびプライベートリポジトリを合算した総稼働時間（Gross Metered Usage）」** に基づいて算出されています。  
> GitHub Web サイトの Billing 画面に表示される無料枠ゲージ（プライベートリポジトリのみを対象とした Included minutes）とは異なり、**パブリックリポジトリでの無料実行時間も合算されてカウントされます**（GitHub 公式 API 仕様上の制約です）。  
> そのため、本ダッシュボードの残り枠やペース判定は、**「月間 2,000 分のクォータを基準とした全体の稼働ペース管理の目安」** としてご活用ください。

- **⚡ Actions Status (リポジトリ横断のワークフロー稼働・障害監視)**:
  - 監視対象リポジトリすべての Actions ワークフロー（`push`, `release`, `pull_request`, `schedule`, `workflow_dispatch` 等）を横断監視。
  - **「現在実行中（Running）」および「最新状態が失敗（Failed）のまま未解決」のワークフローのみ**をタイムライン形式で抽出し、再実行（Re-run）や修正 push・新タグ打ちで後続 Run が成功すると自動的にリストから消去。
  - 問題がない平常時は `All Passed` バッジでクリーンに表示。
- **🔀 Open PRs (複数リポジトリの PR & CI 統合ビュー)**:
  - 監視対象リポジトリのうち、**Open な Pull Request が存在するリポジトリ（または取得エラーがあるリポジトリ）のみ**を自動抽出して表示（Open PR が 0 件かつエラーのないリポジトリは非表示にして画面の余白を最適化）。
  - PR を開く前から `All passed (3/3)`、`1 failed (2/3 passed)`、`3 Checks (2 passed, 1 running)` 等のチェック詳細（分子/分母）が一目で把握可能。
  - リポジトリ階層でも `2/2 PRs passed` や `1/2 PRs failed` と PR 単位の状況を集約表示。
  - 失敗したチェックの詳細ログへワンクリックでジャンプ可能。
- **🖥️ Self-hosted Runners (セルフホステッドランナー監視・任意)**:
  - リポジトリまたは Organization の Self-Hosted Runners の稼働状況（online / busy / offline）を一覧表示。
- **📦 GitHub セクション見出し & 統一されたカード階層**:
  - 将来の他サービス拡張も見据え、`GitHub` セクション見出し行にアカウント名（`Logged in as @username`）、監視リポジトリ数、`API残数` を集約。
  - セクション配下の **`Actions Usage` / `Self-hosted Runners` / `Actions Status` / `Open PRs`** を統一された親カードデザイン・英語タイトルで整理。
  - メイン画面は「閲覧・監視（Glanceable）」に特化し、リポジトリや Runner の登録・削除・設定変更は設定画面（⚙️）に一元化して誤操作を防止。
- **🎮 トークン不要のデモモード (?demo=true)**:
  - URL に `?demo=true` を付けるだけで、PAT なしで誰でもすぐに動くダッシュボードを体験可能。
- **🐞 UI検証・開発用デバッグモード (?debug=true)**:
  - URL に `?debug=true` を付けると、ダッシュボード上部にデバッグコントロールバーを表示。Actions 無料枠枯渇 (100%)、Runner 全台オフライン、CI 障害・API エラーなど、各カードのあらゆる利用状況・状態をワンクリックでシミュレーション・検証可能。
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

> [!CAUTION]
> **共用 PC・公共端末でのご利用に関する注意**  
> 本アプリケーションはセキュリティと利便性の観点から PAT をブラウザの `localStorage` に保持します。  
> そのため、**インターネットカフェ、学校、オフィスの共用 PC など、第三者がアクセスできる環境では絶対に使用しないでください**。ご自身のみが管理する専用の PC / スマートフォンでのご利用を強く推奨します。  
> ※利用を終了したい場合やトークンを破棄したい場合は、右上の設定画面（⚙️）から「ダッシュボードを初期化（ログアウト）」を実行すると、ブラウザ内から即座に完全消去されます。

---

## 🌐 今すぐ使う (Live Demo) & 🚀 はじめかた (Quick Start)

トークンを入力せずに実際の動く画面を試したい方は、デモモードですぐに体験いただけます：  
👉 **[🌟 デモモードを開く (https://asabon.github.io/personal-dev-dashboard/?demo=true)](https://asabon.github.io/personal-dev-dashboard/?demo=true)**

ご自身の GitHub データで本格的に利用する場合は、インストール不要で 3 ステップですぐに利用できます：  
👉 **[🚀 通常モードを開く (https://asabon.github.io/personal-dev-dashboard/)](https://asabon.github.io/personal-dev-dashboard/)**

インストール不要で、ブラウザから 3 ステップですぐに利用できます：

### Step 1: GitHub Personal Access Token (PAT) を取得
- 最も手軽なのは **[Classic PAT（スコープ自動選択リンク）](https://github.com/settings/tokens/new?scopes=repo,user&description=Personal%20Dev%20Dashboard)** からの発行です。
  - 必要な権限（`repo`, `user`）が自動で選択されています。画面下部の「Generate token」をクリックしてトークン文字列（`ghp_...`）をコピーしてください。
  - ※セルフホステッドランナーを監視する場合は、追加で `manage_runners:org`（またはリポジトリの管理者権限）が必要です。
  - 詳細ガイド: [**🔑 GitHub PAT 作成・設定ガイド (docs/user/setup-pat.md)**](docs/user/setup-pat.md)

### Step 2: ダッシュボードを開いてトークンを入力

- [**Personal Dev Dashboard**](https://asabon.github.io/personal-dev-dashboard/) をブラウザで開きます。
- 初回モーダルにコピーした PAT を貼り付け、「ダッシュボードを開始」をクリックします。
- **自分のリポジトリ（非アーカイブ）は登録不要ですぐに自動監視** されます。

### Step 3: 外部リポジトリや Organization の追加設定（任意）

- 他オーナーのリポジトリや所属 Organization のリポジトリ、Self-hosted Runner も合わせて監視したい場合は、右上の設定アイコン（⚙️）から追加登録できます。

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

# README用スクリーンショットの自動撮影 (デモモード利用)
npm run capture-screenshots
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
- 🚀 [**開発・リリース運用ガイド (docs/dev/release-flow.md)**](docs/dev/release-flow.md): AI 開発・レビューサイクル（指示チートシート）、ブランチ戦略、リリース自動公開、CI/CD 設計
- 🗺️ [**開発ロードマップ & 実装実績 (docs/dev/roadmap.md)**](docs/dev/roadmap.md): 開発実績、マイルストーン、今後の拡張アイデア
- 📋 [**変更履歴 (CHANGELOG.md)**](CHANGELOG.md): バージョンごとの新機能・修正・改善のリリースノート履歴

---

## 🛠 技術スタック (Tech Stack)

- **Frontend**: React 19 / TypeScript (Strict) / Vite
- **Styling**: Tailwind CSS v4 / Lucide Icons
- **Testing**: Vitest / React Testing Library / jsdom
- **Deployment**: GitHub Pages (via GitHub Actions)
- **License**: [MIT](LICENSE)
