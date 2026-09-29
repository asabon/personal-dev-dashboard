# アーキテクチャ設計 (Architecture)

## 1. 全体概要

本ダッシュボードは、個人開発者が抱える **「GitHub Actions の無料枠残量」「複数リポジトリの PR 状況」「CI (Actions) の実行結果」** を 1 画面で統合把握するための Web アプリケーションです。

OSS として世界中の開発者が手軽に利用できるよう、**完全クライアントサイド完結型 (Zero-Backend SPA)** で設計します。

```mermaid
graph TD
    subgraph 配布 / ホスティング
        GP[GitHub Pages / 静的ホスティング<br/>HTML / JS / CSS を配信]
    end

    subgraph ユーザー環境（ブラウザ内完結）
        UI[ダッシュボード Web UI]
        Storage[(localStorage<br/>PAT / 監視対象リポジトリ一覧)]
        Client[GitHub API Client<br/>REST & GraphQL]

        UI <--> Storage
        UI <--> Client
    end

    subgraph GitHub 公式
        GH_REST[GitHub REST API<br/>/users/{user}/settings/billing/usage/summary]
        GH_GQL[GitHub GraphQL API<br/>statusCheckRollup]
    end

    GP -.->|アクセス時に静的ファイルをロード| UI
    Client ==>|直接 CORS 通信<br/>Bearer PAT| GH_REST
    Client ==>|直接 CORS 通信<br/>Bearer PAT| GH_GQL
```

---

## 2. セキュリティと認証設計

### 2.1 Bring Your Own Key (BYOK) 方式
- 外部バックエンドサーバーやプロキシを一切設置しません。
- 利用者は初回アクセス時に自身の **GitHub Personal Access Token (PAT)** を入力します。
- 入力されたトークンは、ブラウザの `localStorage` にのみ保存され、外部サーバーに送信されることはありません。
- 通信はすべてブラウザから `api.github.com` へ直接 CORS 経由で実行されます。

### 2.2 推奨トークン権限
利用者が安全に利用できるよう、必要最小限のスコープを UI で明示します。

- **Classic PAT (推奨)**:
  - `repo` (プライベートリポジトリの PR / CI 監視に必要。公開リポジトリのみなら `public_repo`)
  - `user` (Actions 使用量取得に必要。GitHub Billing API の仕様)
- **Fine-grained Personal Access Token**:
  - ※GitHub の仕様上、Fine-grained PAT は個人の Billing API に非対応のため、Actions 使用量は表示できません（PR / CI 監視のみ利用可能）。
  - Repository permissions:
    - **Pull requests**: Read-only
    - **Actions**: Read-only
    - **Checks**: Read-only
    - **Metadata**: Read-only

### 2.3 ログアウト / トークン破棄
- UI 上にいつでもワンクリックでトークンおよび監視設定をローカルストレージから完全消去できる「ログアウト / 設定リセット」機能を提供します。

---

## 3. 技術選定

| レイヤー | 選定技術 | 選定理由 |
| :--- | :--- | :--- |
| **フレームワーク** | **React (TypeScript) + Vite** | 高速なビルド、型安全な API レスポンス処理、コンポーネント化 |
| **スタイリング** | **Tailwind CSS (または Vanilla CSS)** | 軽量、レスポンシブ対応、ダークモード対応が容易 |
| **アイコン** | **Lucide Icons** | シンプルで統一感のある開発者向けアイコンセット |
| **ホスティング** | **GitHub Pages** | GitHub Actions による自動ビルド＆無料配信 |
| **CI/CD** | **GitHub Actions** | `main` ブランチへのプッシュで自動デプロイ |

## 4. ダッシュボード機能の拡張

### 4.1 任意カードの feature module

設定で表示を切り替える追加カードは、`src/features/modules/<feature-id>/feature.tsx` に機能単位で実装します。各 module は次の役割をまとめて公開します。

- 機能 ID と既定の有効状態
- 設定画面の編集コンポーネント
- GitHub API 等からのデータ取得
- カード表示コンポーネント
- 状況サマリーに出す警告とデモデータ（必要な場合）

`src/features/registry.ts` は Vite の `import.meta.glob` で module を検出します。App は登録済み module を共通のデータ取得・カード表示ホストとして扱うため、任意カードの追加で App、設定モーダル、共通 state に機能固有の分岐を追加しないことを基本とします。

機能の有効状態は `AppSettings.features[featureId].enabled` に保存します。保存形式を変更する場合は `src/services/storage.ts` で旧設定から移行し、既存利用者の設定を維持します。Organization 監視一覧は Actions 使用量取得でも共有するため、現時点では共通設定として保持します。

### 4.2 段階的な適用範囲

Self-hosted Runners に続き、Actions 使用量も feature module として扱います。Organization 監視一覧は両機能で共有する共通設定です。リポジトリ一覧は取得データや PR 集計との結び付きが異なるため、現時点ではコア機能として残します。
