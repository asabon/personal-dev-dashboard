# GitHub Personal Access Token (PAT) 作成・設定ガイド

Personal Dev Dashboard をご利用いただくために必要な **GitHub Personal Access Token (PAT)** の作成手順と推奨設定を解説します。

---

## 🔒 セキュリティと安心の仕組み

本アプリケーションは **完全クライアント完結型（Zero-Backend / Bring Your Own Key）** です。

- **外部サーバーへの送信ゼロ**: 入力された PAT は、お使いのブラウザ内 `localStorage` にのみ保存されます。中継サーバーや外部データベースへの送信・保存は一切行われません。
- **直接通信**: すべてのデータ取得は、ブラウザから直接 GitHub 公式 API（`api.github.com`）へ CORS 経由でリクエストされます。
- **いつでも削除可能**: 画面右上のアイコンからワンクリックでトークンを破棄・リセットできます。

> [!CAUTION]
> **共用 PC・公共端末でのご利用に関する注意**  
> トークンはお使いのブラウザの `localStorage` に保持されます。そのため、インターネットカフェ、学校、オフィスの共用 PC など第三者が触れる可能性のある環境では絶対に入力・使用しないでください。ご自身専用の PC やスマートフォンでのご利用を推奨します。

---

## 🎯 トークン形式の選び方

GitHub には 2 種類の PAT がありますが、本アプリケーションでは **Personal Access Token (Classic)** を強く推奨しています。

| 形式 | おすすめ度 | 特徴 | 手間 |
| :--- | :---: | :--- | :---: |
| **Personal Access Token (Classic)** | **強く推奨** | スコープ指定済みリンクから **数クリックで即座に発行可能**。GitHub Actions 使用量（Billing API）の取得に対応しています。 | ★☆☆ (簡単) |
| **Fine-grained Token** | 制約あり | リポジトリ単位で権限を細かく制限できますが、**GitHub の仕様上、Actions 使用量（Billing API）を取得できません**（PR / CI 監視のみ利用可能）。 | ★★★ (項目多め) |

---

## 🚀 方法 1: Classic PAT を作成する（強く推奨・かんたん）

最も手軽でおすすめの方法です。Actions 無料枠使用量と PR/CI 監視のすべての機能をご利用いただけます。

### 1. トークン作成画面を開く
以下のスコープ設定済みリンクをクリックして GitHub のトークン生成ページを開きます：

👉 **[Classic PAT を新規作成（スコープ自動選択リンク）](https://github.com/settings/tokens/new?scopes=repo,user&description=Personal%20Dev%20Dashboard)**

### 2. 項目を確認・入力
リンクから開くと、必要なスコープがあらかじめチェックされています。

1. **Note**: `Personal Dev Dashboard`（用途がわかる名前）
2. **Expiration（有効期限）**: お好みの期間（推奨: `30 days` 〜 `90 days`）
3. **Select scopes（スコープ）**:
   - `[x] repo` — プライベートリポジトリの PR 情報・CI 実行結果の取得、およびリポジトリ専用の Self-hosted runner 監視に必要です。  
     *(※ パブリックリポジトリのみを監視する場合は `public_repo` のみでも利用可能です)*
   - `[x] user` — 月間の GitHub Actions 無料枠使用量（2,000分）の取得に必要です。  
     *(※ GitHub Billing API の仕様上、`read:user` ではなく `user` が必須となります)*
   - `[ ] admin:org`（**任意**）— **Organization 単位で登録されている Self-hosted runner の稼働状況を監視する場合にのみ必須** です。  
     *(※ GitHub の仕様上、Org レベルのランナー一覧 API にアクセスするには `admin:org` スコープが必要となります。個人リポジトリのランナーのみを利用する場合や、ランナー監視機能を使用しない場合は不要です)*

> 💡 **Org のランナーも監視したい場合**:  
> 👉 **[Classic PAT を新規作成（admin:org も含めた自動選択リンク）](https://github.com/settings/tokens/new?scopes=repo,user,admin:org&description=Personal%20Dev%20Dashboard)** から作成すると簡単です。

### 3. トークンを生成
ページ最下部の緑色のボタン **「Generate token」** をクリックします。

### 4. トークンをコピー
生成されたトークン（`ghp_` から始まる文字列）をコピーします。  
> ⚠️ **注意**: トークン文字列はこの画面を閉じると二度と表示されません。必ずここでコピーしてください。

---

## 🛡️ 方法 2: Fine-grained PAT を作成する（最小権限・高度な設定）

対象リポジトリを限定して最小限の権限のみを与えたい場合は、Fine-grained PAT を使用します。

### 1. トークン作成画面を開く
GitHub の [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens/new) を開きます。

### 2. 基本情報の設定
- **Token name**: `Personal Dev Dashboard`
- **Expiration**: 有効期限（最大 1 年）
- **Resource owner**: ご自身のアカウント

### 3. リポジトリの選択 (Repository access)
- **Only select repositories**: ダッシュボードで監視したいリポジトリを選択します。

### 4. 権限の設定 (Permissions)
以下の権限を **Read-only** で付与します：

- **Repository permissions**:
  - `Actions`: **Read-only**（CI ワークフローの状況取得）
  - `Checks`: **Read-only**（Check Runs の成否取得）
  - `Pull requests`: **Read-only**（Open な PR 一覧の取得）
  - `Metadata`: **Read-only**（自動選択されます）
- **Account permissions**:
  - `Plan`: **Read-only**（ユーザーのアカウント情報・使用量取得）

### 5. トークンを生成・コピー
最下部の **「Generate token」** をクリックし、生成された `github_pat_` から始まるトークンをコピーします。

---

## 💻 ダッシュボードへの設定手順

1. **Personal Dev Dashboard** にアクセスします：  
   👉 **[https://asabon.github.io/personal-dev-dashboard/](https://asabon.github.io/personal-dev-dashboard/)**
2. 初回アクセス時に表示される **「Personal Dev Dashboard へようこそ」** のダイアログで、コピーした PAT を入力します。
3. **「利用を開始する」** をクリックします。
4. トークンの検証が成功すると、ダッシュボードが開き Actions 無料枠使用量が表示されます。
5. 画面上部の **「リポジトリ追加」** から、PR や CI 状況を監視したいリポジトリ（例: `owner/repo`）を登録してください。

---

## ❓ トラブルシューティング & よくある質問

### Q. 「Actions 使用量を取得できませんでした」と表示される
- **Classic PAT の場合**: `user` スコープが付与されているか確認してください（`read:user` では GitHub Billing API の権限不足となります）。
- **Fine-grained PAT の場合**: GitHub の仕様上、Fine-grained PAT では個人の Actions Billing API（使用量）を取得できません。Actions 使用量カードを表示するには、Classic PAT（`user`, `repo`）をご利用ください。

### Q. 「リポジトリが見つかりません」または 404 / 403 エラーになる
- 対象リポジトリがプライベートリポジトリの場合、Classic PAT に `repo` スコープが必要です（`public_repo` のみではプライベートリポジトリを参照できません）。
- Fine-grained PAT の場合は、トークン設定の「Repository access」で対象リポジトリが選択されているか確認してください。

### Q. Organization の Self-hosted runner（自前ランナー）が表示されない
- GitHub API の仕様上、Organization レベルのランナー一覧を取得するには **`admin:org`** スコープが必要です。
- トークンに `admin:org` スコープが付与されているか確認し、不足している場合は GitHub のトークン編集画面から付与してください。
- また、ダッシュボードの監視対象リポジトリに、該当する Organization のリポジトリが 1 つ以上登録されている必要があります。

### Q. トークンを変更・更新したい
- 画面右上の **鍵アイコン（設定）** をクリックすると、新しいトークンへの更新や登録済みリポジトリの管理がいつでも行えます。

### Q. トークンをブラウザから完全に消去したい
- 画面右上の **ログアウト / 設定クリア** を行うことで、ブラウザの `localStorage` に保存されている PAT と設定情報を完全に消去できます。
