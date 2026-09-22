export interface AppSettings {
  /** GitHub Personal Access Token (PAT) */
  pat: string;
  /** 認証された GitHub ユーザー名 */
  username: string;
  /** 監視対象リポジトリ一覧 (例: ["owner/repo1", "owner/repo2"]) */
  repositories: string[];
  /** 自動更新間隔（秒）。0 は自動更新無効 */
  refreshIntervalSec: number;
  /** セルフホステッドランナーの稼働状況を表示するかどうか (デフォルト: false) */
  showSelfHostedRunners?: boolean;
  /** ランナー監視対象の Organization 一覧 (任意) */
  monitoredOrgs?: string[];
}

export interface ActionsUsageBreakdown {
  ubuntu: number;
  macOS: number;
  windows: number;
}

export type ActionsUsageAccountType = 'user' | 'org';

export interface ActionsUsageAccount {
  name: string;
  type: ActionsUsageAccountType;
}

export interface ActionsUsageItem {
  usage: ActionsUsage | null;
  error: string | null;
  isLoading?: boolean;
}

export interface ActionsUsage {
  /** OS倍率（Ubuntu x1, macOS x10, Windows x2）適用後の換算合計分 */
  totalMinutesUsed: number;
  /** 無料枠（通常 2000 分） */
  includedMinutes: number;
  /** 使用率 (0 - 100) */
  usagePercentage: number;
  /** 各 OS の実稼働時間（分）内訳 */
  breakdown: ActionsUsageBreakdown;
  /** 最終更新日時 (ISO 8601) */
  lastUpdated: string;
  /** アカウント名（個人ユーザー名または Organization 名） */
  accountName?: string;
  /** アカウント種別 ('user' | 'org') */
  accountType?: ActionsUsageAccountType;
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

export interface SelfHostedRunner {
  id: number;
  name: string;
  os: string;
  status: 'online' | 'offline';
  busy: boolean;
  labels: string[];
  scopeType: 'org' | 'repo';
  scopeName: string; // "org名" または "owner/repo"
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
  usageMap?: Record<string, ActionsUsageItem>;
  selectedUsageAccount?: string;
  projects: RepositoryDashboardData[];
  runners: SelfHostedRunner[];
  isLoadingRunners: boolean;
  runnersError: string | null;
  error: string | null;
}

export interface UserRepositoryOption {
  fullName: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  description: string | null;
  updatedAt: string;
  stargazersCount: number;
  fork: boolean;
}
