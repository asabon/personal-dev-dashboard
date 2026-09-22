import type {
  ActionsUsage,
  AppSettings,
  RepositoryDashboardData,
  SelfHostedRunner,
} from '../types';

export const DEMO_SETTINGS: AppSettings = {
  pat: 'demo-mock-token',
  username: 'demo-developer',
  repositories: [
    'asabon/personal-dev-dashboard',
    'octocat/frontend-app',
    'octocat/api-gateway',
  ],
  refreshIntervalSec: 60,
  showSelfHostedRunners: true,
  monitoredOrgs: ['demo-org'],
};

export const DEMO_USAGE: ActionsUsage = {
  totalMinutesUsed: 550,
  includedMinutes: 2000,
  usagePercentage: 28,
  breakdown: {
    ubuntu: 550,
    macOS: 0,
    windows: 0,
  },
  lastUpdated: new Date().toISOString(),
};

export const DEMO_PROJECTS: RepositoryDashboardData[] = [
  {
    owner: 'asabon',
    name: 'personal-dev-dashboard',
    fullName: 'asabon/personal-dev-dashboard',
    isPrivate: false,
    pullRequests: [
      {
        id: 'pr-27',
        number: 27,
        title: 'feat: Vitest による単体テスト基盤の導入と主要ロジック・コンポーネントテストの実装',
        url: 'https://github.com/asabon/personal-dev-dashboard/pull/27',
        updatedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        author: {
          login: 'asabon',
          avatarUrl: 'https://avatars.githubusercontent.com/u/10427?v=4',
        },
        headBranch: 'feature/setup-unit-testing',
        headSha: '939c1cc',
        shortSha: '939c1cc',
        overallCiState: 'SUCCESS',
        checks: [
          {
            id: 'check-1',
            name: 'Test, TypeCheck & Build',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            detailsUrl: '#',
          },
          {
            id: 'check-2',
            name: 'update_release_draft',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            detailsUrl: '#',
          },
        ],
      },
      {
        id: 'pr-25',
        number: 25,
        title: 'fix: Actions 使用量カードの表示方針を整理し使用量・残量・単位表記を統一',
        url: 'https://github.com/asabon/personal-dev-dashboard/pull/25',
        updatedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        author: {
          login: 'asabon',
          avatarUrl: 'https://avatars.githubusercontent.com/u/10427?v=4',
        },
        headBranch: 'fix/align-actions-usage-display',
        headSha: '362b414',
        shortSha: '362b414',
        overallCiState: 'SUCCESS',
        checks: [
          {
            id: 'check-3',
            name: 'CI / TypeCheck & Build',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            detailsUrl: '#',
          },
        ],
      },
    ],
  },
  {
    owner: 'octocat',
    name: 'frontend-app',
    fullName: 'octocat/frontend-app',
    isPrivate: true,
    pullRequests: [
      {
        id: 'pr-104',
        number: 104,
        title: 'feat: Add OAuth login & multi-factor authentication flow',
        url: '#',
        updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        author: {
          login: 'alice',
          avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
        },
        headBranch: 'feat/oauth-flow',
        headSha: 'a1b2c3d',
        shortSha: 'a1b2c3d',
        overallCiState: 'PENDING',
        checks: [
          {
            id: 'check-11',
            name: 'Jest Unit Tests',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            detailsUrl: '#',
          },
          {
            id: 'check-12',
            name: 'E2E Playwright',
            status: 'IN_PROGRESS',
            conclusion: null,
            detailsUrl: '#',
          },
          {
            id: 'check-13',
            name: 'ESLint / Prettier',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            detailsUrl: '#',
          },
        ],
      },
      {
        id: 'pr-102',
        number: 102,
        title: 'fix: Resolves broken CSS flexbox alignment in Safari 17',
        url: '#',
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        author: {
          login: 'bob',
          avatarUrl: 'https://avatars.githubusercontent.com/u/1024025?v=4',
        },
        headBranch: 'fix/safari-flex',
        headSha: 'f8e7d6c',
        shortSha: 'f8e7d6c',
        overallCiState: 'FAILURE',
        checks: [
          {
            id: 'check-21',
            name: 'Visual Regression Test',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            detailsUrl: '#',
          },
          {
            id: 'check-22',
            name: 'TypeScript Typecheck',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            detailsUrl: '#',
          },
        ],
      },
    ],
  },
  {
    owner: 'octocat',
    name: 'api-gateway',
    fullName: 'octocat/api-gateway',
    isPrivate: true,
    pullRequests: [],
  },
];

export const DEMO_RUNNERS: SelfHostedRunner[] = [
  {
    id: 101,
    name: 'gpu-worker-node-01',
    os: 'Linux',
    status: 'online',
    busy: false,
    labels: ['self-hosted', 'Linux', 'X64', 'gpu-nvidia'],
    scopeType: 'org',
    scopeName: 'demo-org',
  },
  {
    id: 102,
    name: 'm2-mac-builder-02',
    os: 'macOS',
    status: 'online',
    busy: true,
    labels: ['self-hosted', 'macOS', 'ARM64', 'xcode-16'],
    scopeType: 'org',
    scopeName: 'demo-org',
  },
  {
    id: 103,
    name: 'ci-backup-box-03',
    os: 'Linux',
    status: 'offline',
    busy: false,
    labels: ['self-hosted', 'Linux', 'X64'],
    scopeType: 'repo',
    scopeName: 'octocat/frontend-app',
  },
];
