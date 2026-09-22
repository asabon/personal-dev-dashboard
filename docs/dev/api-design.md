# GitHub API 設計 (API Design)

## 1. 概要

本アプリケーションは GitHub REST API と GraphQL API を併用し、最小限のリクエスト数で必要なデータを効率よく集約します。

---

## 2. API エンドポイント詳細

### 2.1 GitHub Actions 使用量取得 (REST API)

ユーザー個人の今月の GitHub Actions 無料枠（月2000分）の使用状況を取得します。

- **Endpoint**: `GET https://api.github.com/users/{username}/settings/billing/usage/summary?product=actions`
- **権限 (Scopes)**: `user` (Classic PAT)
- **Headers**:
  ```http
  Authorization: Bearer <PAT>
  Accept: application/vnd.github+json
  X-GitHub-Api-Version: 2022-11-28
  ```
- **レスポンス例**:
  ```json
  {
    "total_minutes_used": 1240,
    "total_paid_minutes_used": 0,
    "included_minutes": 2000,
    "minutes_used_breakdown": {
      "UBUNTU": 1100,
      "MACOS": 140,
      "WINDOWS": 0
    }
  }
  ```
- **集計仕様**:
  - `usageItems` 配列から各ランナー OS（Linux/Ubuntu, macOS, Windows）の実稼働時間を抽出。
  - GitHub Actions の課金・無料枠ルールに基づき、各 OS の消費倍率（**Ubuntu: 1倍、macOS: 10倍、Windows: 2倍**）を適用して無料枠換算使用量（`totalMinutesUsed`）を算出。
  - 内訳（`breakdown`）には各 OS の実稼働時間を保持。
- **更新頻度**: 15分〜30分おき（または手動リフレッシュ）。毎分更新する必要はないため、キャッシュしてレートリミットを節約します。

---

### 2.2 PR 一覧 & CI ステータス同時取得 (GraphQL API)

REST API で個別に runs を叩くのではなく、GraphQL の `statusCheckRollup` を用いて **「PR 情報 + その最新コミットで走っている全 Actions / Check 実行結果」を 1 リクエストで一括取得** します。

- **Endpoint**: `POST https://api.github.com/graphql`
- **Headers**:
  ```http
  Authorization: Bearer <PAT>
  Content-Type: application/json
  ```
- **Query 例**:
  ```graphql
  query GetRepositoryPRsAndChecks($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      nameWithOwner
      isPrivate
      pullRequests(first: 20, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
        nodes {
          id
          number
          title
          url
          updatedAt
          author {
            login
            avatarUrl
          }
          headRefName
          commits(last: 1) {
            nodes {
              commit {
                oid
                abbreviatedOid
                statusCheckRollup {
                  state # SUCCESS, FAILURE, PENDING, EXPECTED
                  contexts(first: 20) {
                    nodes {
                      ... on CheckRun {
                        id
                        name
                        status # QUEUED, IN_PROGRESS, COMPLETED
                        conclusion # SUCCESS, FAILURE, NEUTRAL, CANCELLED, TIMED_OUT, ACTION_REQUIRED
                        detailsUrl
                      }
                      ... on StatusContext {
                        id
                        context
                        state # SUCCESS, PENDING, FAILURE, ERROR
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  ```

#### 複数リポジトリの一括取得（エイリアス対応）
監視リポジトリが複数ある場合、GraphQL のエイリアス機能を使って 1 回のリクエストで複数リポジトリを同時に取得できます。

```graphql
query GetMultiRepos {
  repo1: repository(owner: "owner1", name: "repo-a") {
    ...RepoPRFields
  }
  repo2: repository(owner: "owner2", name: "repo-b") {
    ...RepoPRFields
  }
}
```

---

### 2.3 ユーザー情報取得 (認証検証用 REST API)

トークン入力時に有効性を検証し、ユーザー名を取得します。

- **Endpoint**: `GET https://api.github.com/user`
- **利用目的**:
  - トークンの疎通確認（無効ならエラー表示）
  - ユーザー名（`login`）の取得（Actions 使用量 API のパスパラメータに使用）

---

## 3. レートリミットとキャッシュ戦略

| API 種別 | 制限（PAT 認証時） | 本アプリの戦略 |
| :--- | :--- | :--- |
| **REST API** | 5,000 requests / hour | Actions使用量はローカルキャッシュ（有効期限15分）し、連続呼び出しを防ぐ |
| **GraphQL API** | 5,000 points / hour | エイリアスを活用して複数リポジトリを1リクエストに集約。自動更新は 60 秒間隔（または手動） |

- 各レスポンスヘッダー（`x-ratelimit-remaining`, `x-ratelimit-reset`）を監視し、残り枠が少なくなった場合は UI に警告を表示します。
