# Personal Dev Dashboard 🚀

> 個人開発者のための **GitHub Actions 無料枠使用量 & 複数リポジトリ PR × CI 統合ダッシュボード**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 💡 概要 (Overview)

個人開発で複数リポジトリを並行して動かしていると、以下のような不便が生じがちです：

- **「今月 Actions の無料枠（2,000分）をどれくらい消費したか」** を確認するために設定の課金画面まで潜る必要がある
- 各リポジトリの **「どの PR の CI が動いていて、どれが落ちたか」** を 1 画面でパッと一覧できない

**Personal Dev Dashboard** は、これらの情報をブラウザ 1 画面でリアルタイムに俯瞰できる、個人開発者特化のダッシュボードです。

---

## ✨ 主な特徴 (Features)

- **⚡ 完全クライアント完結 (Zero-Backend / BYOK)**:
  - 外部サーバーへの依存ゼロ。GitHub Pages でホストされた URL を開くだけですぐに使えます。
  - 入力した Personal Access Token (PAT) はブラウザの `localStorage` にのみ保存され、外部に送信されることはありません。
- **📊 GitHub Actions 使用量の一目でわかる可視化**:
  - 今月の無料枠（2,000分）の使用状況・残量をプログレスバーで表示。
  - OS 別（Ubuntu / macOS / Windows）の消費内訳も確認可能。
- **🔍 複数リポジトリの PR & CI 統合ビュー**:
  - 複数リポジトリの Open な Pull Request を一元表示。
  - 各 PR の最新コミットで走っている Actions (Check Runs) の成功/失敗/進行中ステータスを即座に把握。
- **🎨 開発者向けモダンダークテーマ**:
  - サブモニターやデスクトップの片隅に常時表示しやすい、洗練されたデザイン。

---

## 📚 仕様・ドキュメント (Specifications)

設計の詳細は [`docs/`](docs/) 配下に整理されています：

- 🏛️ [**システムアーキテクチャ (docs/architecture.md)**](docs/architecture.md)  
  クライアント完結型設計、セキュリティとトークン管理、技術選定
- 📡 [**GitHub API 設計 (docs/api-design.md)**](docs/api-design.md)  
  REST (Actions Usage) と GraphQL (`statusCheckRollup`) による効率的なデータ取得とレート制限対策
- 🧩 [**データモデル (docs/data-model.md)**](docs/data-model.md)  
  ローカル設定・キャッシュ構造、React 状態管理の TypeScript 型定義
- 🖥️ [**UI / UX 設計 (docs/ui-design.md)**](docs/ui-design.md)  
  画面レイアウト、コンポーネント構成、オンボーディング導線
- 🚀 [**開発・リリース運用ガイド (docs/release-flow.md)**](docs/release-flow.md)  
  GitHub Flow ブランチ戦略、GitHub Releases 駆動の本番デプロイ手順、CI/CD 設計

---

## 🛠 技術スタック (Tech Stack)

- **Frontend**: React 19 / TypeScript / Vite
- **Styling**: Tailwind CSS / Lucide Icons
- **Deployment**: GitHub Pages (via GitHub Actions)

---

## 🗺 ロードマップ (Roadmap)

- [x] **Phase 1 (MVP)**:
  - [x] Vite + React + Tailwind CSS のプロジェクト基盤構築
  - [x] トークン入力 & 検証（オンボーディング）画面
  - [x] Actions 無料枠使用量カードの実装 (REST API)
  - [x] リポジトリ手動追加 & PR × CI ステータス一覧の実装 (GraphQL API)
  - [x] localStorage への設定永続化
- [ ] **Phase 2**:
  - [x] GitHub Pages デプロイ & CI ワークフロー構築
  - [x] 自動更新ポーリング機能 (設定モーダルで間隔切替可能)
  - [ ] 自分のリポジトリからのワンクリック追加機能
- [ ] **Phase 3**:
  - [ ] Self-hosted runner の稼働状況サポート（任意）
  - [ ] CI 失敗時の通知機能