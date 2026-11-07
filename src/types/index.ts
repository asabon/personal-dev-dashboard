export interface AppSettings {
  /** GitHub Personal Access Token (PAT) */
  pat: string;
  /** 認証された GitHub ユーザー名 */
  username: string;
  /** 監視対象リポジトリ一覧 (例: ["owner/repo1", "owner/repo2"]) */
  repositories: string[];
  /** 自動更新間隔（秒）。0 は自動更新無効 */
  refreshIntervalSec: number;
  /** 拡張可能なダッシュボード機能の設定 */
  features: Record<string, FeatureSettings>;
  /** ランナー監視対象の Organization 一覧 (任意) */
  monitoredOrgs?: string[];
}

export interface FeatureSettings {
  enabled: boolean;
  options?: Record<string, unknown>;
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
  /** 最終プッシュ日時 (ISO 8601、スマート差分ポーリング判定用) */
  pushedAt?: string;
  /** 最終更新日時 (ISO 8601、スマート差分ポーリング判定用) */
  updatedAt?: string;
  /** フォークリポジトリかどうか */
  isFork?: boolean;
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

export type WorkflowRunStatus =
  | 'queued'
  | 'in_progress'
  | 'completed'
  | 'waiting'
  | 'requested'
  | 'pending';

export type WorkflowRunConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | 'startup_failure'
  | 'stale'
  | null;

export interface WorkflowRunItem {
  id: number;
  /** ワークフロー定義 ID (GitHub Actions workflow_id) */
  workflowId?: number;
  /** Pull Request 番号 (PR トリガー時、GitHub API から返却された場合) */
  pullRequestNumber?: number;
  /** 紐づく Pull Request の状態 ('open' | 'closed')。PR トリガーでない場合は undefined */
  pullRequestState?: 'open' | 'closed';
  /** Head リポジトリのフルネーム (フォーク PR 識別用) */
  headRepositoryFullName?: string;
  /** 再実行試行回数 (1 = 初回実行, 2+ = Rerun) */
  runAttempt?: number;
  /** 最新試行の開始日時 (ISO 8601、Rerun 時の実行順判定用) */
  runStartedAt?: string;
  /** リポジトリフルネーム (例: "owner/repo") */
  repoFullName: string;
  /** ワークフロー名 (例: "CI", "Deploy to GitHub Pages") */
  workflowName: string;
  /** 実行タイトル / コミットメッセージ / タグ名 */
  displayTitle: string;
  /** 実行番号 (例: 42) */
  runNumber: number;
  /** トリガーイベント (例: "push", "pull_request", "release", "workflow_dispatch", "schedule") */
  event: string;
  /** 実行ステータス */
  status: WorkflowRunStatus;
  /** 実行結果 (完了時) */
  conclusion: WorkflowRunConclusion;
  /** GitHub Actions 実行詳細 URL */
  htmlUrl: string;
  /** ブランチ名またはタグ名 (例: "main", "v0.4.0") */
  headBranch: string;
  /** 短縮コミット SHA (7文字) */
  shortSha: string;
  /** 実行者情報 */
  actor: {
    login: string;
    avatarUrl: string;
  };
  /** 作成日時 (ISO 8601) */
  createdAt: string;
  /** 最終更新日時 (ISO 8601) */
  updatedAt: string;
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
  projects: RepositoryDashboardData[];
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
