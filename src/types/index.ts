export interface AppSettings {
  /** GitHub Personal Access Token (PAT) */
  pat: string;
  /** 認証された GitHub ユーザー名 */
  username: string;
  /** 監視対象リポジトリ一覧 (例: ["owner/repo1", "owner/repo2"]) */
  repositories: string[];
  /** 自動更新間隔（秒）。0 は自動更新無効 */
  refreshIntervalSec: number;
}

export interface ActionsUsageBreakdown {
  ubuntu: number;
  macOS: number;
  windows: number;
}

export interface ActionsUsage {
  totalMinutesUsed: number;
  includedMinutes: number; // 通常 2000 分
  usagePercentage: number; // 0 - 100
  breakdown: ActionsUsageBreakdown;
  lastUpdated: string; // ISO 8601
}

export type CheckStatus = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'WAITING' | 'PENDING';

export type CheckConclusion =
  | 'SUCCESS'
  | 'FAILURE'
  | 'NEUTRAL'
  | 'CANCELLED'
  | 'TIMED_OUT'
  | 'ACTION_REQUIRED'
  | 'STALE'
  | 'SKIPPED'
  | null;

export interface ActionCheck {
  id: string;
  name: string;
  status: CheckStatus;
  conclusion: CheckConclusion;
  detailsUrl: string;
}

export type OverallCiState = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'NONE';

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
  overallCiState: OverallCiState;
  checks: ActionCheck[];
}

export interface RepositoryDashboardData {
  owner: string;
  name: string;
  fullName: string;
  isPrivate: boolean;
  pullRequests: PullRequestItem[];
  error?: string;
  isLoading?: boolean;
}

export interface DashboardState {
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  rateLimit: {
    remaining: number;
    limit: number;
    resetAt: Date;
  } | null;
  usage: ActionsUsage | null;
  projects: RepositoryDashboardData[];
  error: string | null;
}
