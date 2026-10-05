import type { RepositoryDashboardData } from '../types';
import type { RateLimitInfo } from '../services/githubApi';
import { DEMO_PROJECTS } from './mockData';

export interface DebugScenarioOption<T> {
  id: string;
  label: string;
  category?: string;
  value: T;
}

// 健全状態のリポジトリデータ（全CIグリーン）
const healthyProjects: RepositoryDashboardData[] = DEMO_PROJECTS.map((project) => ({
  ...project,
  pullRequests: project.pullRequests.map((pr) => ({
    ...pr,
    overallCiState: 'SUCCESS',
    checks: pr.checks.map((check) => ({
      ...check,
      status: 'COMPLETED',
      conclusion: 'SUCCESS',
    })),
  })),
}));

// クリティカル状態のリポジトリデータ（CI失敗・多重障害）
const criticalProjects: RepositoryDashboardData[] = DEMO_PROJECTS.map((project) => ({
  ...project,
  pullRequests: project.pullRequests.map((pr) => ({
    ...pr,
    overallCiState: 'FAILURE',
    checks: pr.checks.map((check) => ({
      ...check,
      status: 'COMPLETED',
      conclusion: 'FAILURE',
    })),
  })),
}));

// 空状態のリポジトリデータ（PR 0件・クリーン）
const emptyProjects: RepositoryDashboardData[] = DEMO_PROJECTS.map((project) => ({
  ...project,
  pullRequests: [],
}));

// 実行中CIが含まれるデータ
const inProgressProjects: RepositoryDashboardData[] = DEMO_PROJECTS.map((project) => ({
  ...project,
  pullRequests: project.pullRequests.map((pr) => ({
    ...pr,
    overallCiState: 'PENDING',
    checks: pr.checks.map((check) => ({
      ...check,
      status: 'IN_PROGRESS',
      conclusion: null,
    })),
  })),
}));

// 一部リポジトリで取得エラーが発生したデータ
const errorProjects: RepositoryDashboardData[] = [
  ...DEMO_PROJECTS.slice(0, 1),
  {
    owner: 'octocat',
    name: 'frontend-app',
    fullName: 'octocat/frontend-app',
    isPrivate: true,
    pullRequests: [],
    error: 'リポジトリが見つかりません、またはアクセス権限がありません (404 Not Found)',
  },
];

export interface RepositoriesScenarioState {
  projects: RepositoryDashboardData[];
  isLoading: boolean;
  error: string | null;
}

export const REPOSITORIES_DEBUG_SCENARIOS: DebugScenarioOption<RepositoriesScenarioState>[] = [
  {
    id: 'normal',
    category: 'PR あり (通常)',
    label: '全 CI 成功 (健全)',
    value: {
      projects: healthyProjects,
      isLoading: false,
      error: null,
    },
  },
  {
    id: 'in-progress',
    category: 'PR あり (通常)',
    label: 'CI 実行中のみ (Running)',
    value: {
      projects: inProgressProjects,
      isLoading: false,
      error: null,
    },
  },
  {
    id: 'warning',
    category: 'PR あり (通常)',
    label: 'CI 失敗・進行中混在 (警告)',
    value: {
      projects: DEMO_PROJECTS,
      isLoading: false,
      error: null,
    },
  },
  {
    id: 'critical',
    category: 'PR あり (通常)',
    label: '全 CI 失敗 (多重障害)',
    value: {
      projects: criticalProjects,
      isLoading: false,
      error: null,
    },
  },
  {
    id: 'empty',
    category: 'PR なし・異常',
    label: 'PR なし (Clean)',
    value: {
      projects: emptyProjects,
      isLoading: false,
      error: null,
    },
  },
  {
    id: 'error',
    category: 'PR なし・異常',
    label: 'リポジトリ取得エラー (404)',
    value: {
      projects: errorProjects,
      isLoading: false,
      error: '一部のリポジトリ取得に失敗しました',
    },
  },
  {
    id: 'loading',
    category: 'PR なし・異常',
    label: '読込中 (Loading)',
    value: {
      projects: [],
      isLoading: true,
      error: null,
    },
  },
];

export const RATE_LIMIT_DEBUG_SCENARIOS: DebugScenarioOption<RateLimitInfo>[] = [
  {
    id: 'healthy',
    category: 'API 残量',
    label: '潤沢 (4892 / 5000)',
    value: {
      remaining: 4892,
      limit: 5000,
      resetAt: new Date(Date.now() + 1000 * 60 * 45),
    },
  },
  {
    id: 'low',
    category: 'API 残量',
    label: '残少 (15 / 5000)',
    value: {
      remaining: 15,
      limit: 5000,
      resetAt: new Date(Date.now() + 1000 * 60 * 10),
    },
  },
  {
    id: 'exhausted',
    category: 'API 残量',
    label: '枯渇 (0 / 5000)',
    value: {
      remaining: 0,
      limit: 5000,
      resetAt: new Date(Date.now() + 1000 * 60 * 25),
    },
  },
];

export interface OverallDebugPreset {
  id: string;
  label: string;
  badgeTone: 'emerald' | 'amber' | 'rose' | 'slate' | 'violet';
  scenarioIds: {
    actionsUsage: string;
    selfHostedRunners: string;
    repositories: string;
    rateLimit: string;
  };
}

export const OVERALL_DEBUG_PRESETS: OverallDebugPreset[] = [
  {
    id: 'healthy',
    label: '健全 (Healthy)',
    badgeTone: 'emerald',
    scenarioIds: {
      actionsUsage: 'normal',
      selfHostedRunners: 'all-idle',
      repositories: 'normal',
      rateLimit: 'healthy',
    },
  },
  {
    id: 'warning',
    label: '警告 (Warning)',
    badgeTone: 'amber',
    scenarioIds: {
      actionsUsage: 'warning',
      selfHostedRunners: 'offline-running',
      repositories: 'warning',
      rateLimit: 'healthy',
    },
  },
  {
    id: 'critical',
    label: '障害・枯渇 (Critical)',
    badgeTone: 'rose',
    scenarioIds: {
      actionsUsage: 'critical',
      selfHostedRunners: 'all-offline',
      repositories: 'critical',
      rateLimit: 'low',
    },
  },
  {
    id: 'empty',
    label: '空状態 (Empty)',
    badgeTone: 'slate',
    scenarioIds: {
      actionsUsage: 'empty',
      selfHostedRunners: 'empty',
      repositories: 'empty',
      rateLimit: 'healthy',
    },
  },
  {
    id: 'error',
    label: 'API 障害 (Error)',
    badgeTone: 'violet',
    scenarioIds: {
      actionsUsage: 'error',
      selfHostedRunners: 'error',
      repositories: 'error',
      rateLimit: 'exhausted',
    },
  },
];
