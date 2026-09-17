# データモデル定義 (Data Model)

## 1. ローカルストレージ保持データ (Settings & Cache)

ブラウザの `localStorage` に保存する設定情報です。

### 1.1 アプリ設定 (`app_settings`)
```typescript
export interface AppSettings {
  /** GitHub Personal Access Token */
  pat: string;
  /** 認証ユーザー名 */
  username: string;
  /** 監視対象リポジトリ一覧 (owner/name 形式) */
  repositories: string[];
  /** 自動更新間隔 (秒単位。0 の場合は手動のみ) */
  refreshIntervalSec: number;
}
```

---

## 2. アプリケーション状態 (Application State)

UI 描画のために React の State として保持する統合データ構造です。

### 2.1 Actions 使用量モデル
```typescript
export interface ActionsUsage {
  totalMinutesUsed: number;
  includedMinutes: number; // 無料枠（通常 2000 分）
  usagePercentage: number; // 使用率 (0 - 100%)
  breakdown: {
    ubuntu: number;
    macOS: number;
    windows: number;
  };
  lastUpdated: string; // ISO 8601
}
```

### 2.2 PR & CI 実行結果モデル
```typescript
export type CheckStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED';
export type CheckConclusion =
  | 'SUCCESS'
  | 'FAILURE'
  | 'NEUTRAL'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'ACTION_REQUIRED'
  | 'PENDING';

export interface ActionCheck {
  id: string;
  name: string;
  status: CheckStatus;
  conclusion: CheckConclusion | null;
  detailsUrl: string;
}

export interface PullRequestItem {
  id: string;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  headBranch: string;
  headSha: string;
  shortSha: string;
  /** PR 全体の CI 判定 (SUCCESS / FAILURE / PENDING / NONE) */
  overallCiState: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'NONE';
  /** 紐づく個別チェック一覧 */
  checks: ActionCheck[];
}

export interface RepositoryDashboardData {
  owner: string;
  name: string;
  fullName: string; // "owner/name"
  isPrivate: boolean;
  pullRequests: PullRequestItem[];
  error?: string; // リポジトリ取得エラー（404/権限不足など）の場合
}
```

### 2.3 ダッシュボード全体状態 (Root State)
```typescript
export interface DashboardState {
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  rateLimit: {
    remaining: number;
    resetAt: Date;
  } | null;
  usage: ActionsUsage | null;
  projects: RepositoryDashboardData[];
  error: string | null;
}
```
