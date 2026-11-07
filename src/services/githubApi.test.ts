import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearWorkflowRunsCache,
  fetchActionsUsage,
  fetchAllWorkflowRuns,
  fetchOrgActionsUsage,
  fetchRepositoryWorkflowRuns,
  fetchViewerOwnedRepositoriesAndPRs,
  recordRepositoryActivity,
  selectActiveRepositoriesForPolling,
} from './githubApi';

describe('githubApi - Actions 使用量および倍率計算テスト', () => {
  const TEST_PAT = 'ghp_TEST_TOKEN_12345';
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    clearWorkflowRunsCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('usageItems から OS 倍率（Ubuntu x1, macOS x10, Windows x2）を正しく適用して totalMinutesUsed を算出すること', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          timePeriod: { year: 2026, month: 9 },
          user: 'testuser',
          product: 'Actions',
          usageItems: [
            {
              product: 'Actions',
              sku: 'actions_linux',
              unitType: 'minutes',
              grossQuantity: 100,
            },
            {
              product: 'Actions',
              sku: 'actions_macos',
              unitType: 'minutes',
              grossQuantity: 10,
            },
            {
              product: 'Actions',
              sku: 'actions_windows',
              unitType: 'minutes',
              grossQuantity: 20,
            },
            {
              product: 'Actions',
              sku: 'actions_storage',
              unitType: 'gigabyte-hours',
              grossQuantity: 50, // 分数ではないので除外される
            },
          ],
        }),
        {
          status: 200,
          headers: new Headers({
            'x-ratelimit-remaining': '4999',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-reset': '1700000000',
          }),
        }
      );
    });

    const result = await fetchActionsUsage(TEST_PAT, 'testuser');

    // 実稼働時間の内訳
    expect(result.breakdown.ubuntu).toBe(100);
    expect(result.breakdown.macOS).toBe(10);
    expect(result.breakdown.windows).toBe(20);

    // 倍率換算合計: 100 * 1 + 10 * 10 + 20 * 2 = 100 + 100 + 40 = 240分
    expect(result.totalMinutesUsed).toBe(240);
    expect(result.includedMinutes).toBe(2000);
    expect(result.usagePercentage).toBe(12); // 240 / 2000 = 12%
    expect(result.accountName).toBe('testuser');
    expect(result.accountType).toBe('user');
  });

  it('Organization の場合も正しく倍率計算が行われ accountType が org になること', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          usageItems: [
            {
              product: 'Actions',
              sku: 'actions_linux',
              unitType: 'minutes',
              grossQuantity: 200,
            },
          ],
        }),
        { status: 200 }
      );
    });

    const result = await fetchOrgActionsUsage(TEST_PAT, 'test-org');

    expect(result.breakdown.ubuntu).toBe(200);
    expect(result.totalMinutesUsed).toBe(200);
    expect(result.accountName).toBe('test-org');
    expect(result.accountType).toBe('org');
  });

  it('fetchRepositoryWorkflowRuns は過去の累積 total_count が perPage を超えていても正常取得時は incompleteCoverage を false にすること', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          total_count: 450,
          workflow_runs: Array.from({ length: 30 }, (_, i) => ({
            id: i + 1,
            workflow_id: 10,
            name: 'CI',
            display_title: `Run ${i + 1}`,
            run_number: 450 - i,
            event: 'push',
            status: 'completed',
            conclusion: 'success',
            html_url: `https://github.com/asabon/personal-dev-dashboard/actions/runs/${i + 1}`,
            head_branch: 'main',
            head_sha: '1234567890abcdef',
            actor: { login: 'asabon', avatar_url: '' },
            created_at: '2026-09-25T10:00:00Z',
            updated_at: '2026-09-25T10:05:00Z',
          })),
        }),
        { status: 200 }
      );
    });

    const result = await fetchRepositoryWorkflowRuns(
      TEST_PAT,
      'asabon',
      'personal-dev-dashboard',
      30
    );

    expect(result.runs).toHaveLength(30);
    expect(result.incompleteCoverage).toBe(false);
    expect(result.warning).toBeUndefined();
  });

  it('fetchAllWorkflowRuns は20リポジトリを超える場合に超過分をスキップし incompleteCoverage と警告を返すこと', async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          total_count: 1,
          workflow_runs: [],
        }),
        { status: 200 }
      );
    });

    const repos = Array.from({ length: 22 }, (_, i) => `owner/repo-${i + 1}`);
    const result = await fetchAllWorkflowRuns(TEST_PAT, repos, 10);

    expect(result.incompleteCoverage).toBe(true);
    expect(result.warning).toContain('先頭 20 リポジトリのみ');
    expect(result.warning).toContain('残り 2 件をスキップ');
  });

  it('fetchRepositoryWorkflowRuns は再実行 (run_attempt > 1) が cancelled の場合に直前の試行から failure を復元すること', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/attempts/1')) {
        return new Response(
          JSON.stringify({
            id: 777,
            run_attempt: 1,
            status: 'completed',
            conclusion: 'failure',
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          total_count: 1,
          workflow_runs: [
            {
              id: 777,
              workflow_id: 10,
              name: 'CI',
              display_title: 'Rerun cancelled after failure',
              run_number: 50,
              run_attempt: 2,
              event: 'push',
              status: 'completed',
              conclusion: 'cancelled',
              html_url: 'https://github.com/asabon/personal-dev-dashboard/actions/runs/777',
              head_branch: 'main',
              head_sha: '1234567890abcdef',
              actor: { login: 'asabon', avatar_url: '' },
              created_at: '2026-09-25T10:00:00Z',
              updated_at: '2026-09-25T10:10:00Z',
            },
          ],
        }),
        { status: 200 }
      );
    });

    const result = await fetchRepositoryWorkflowRuns(
      TEST_PAT,
      'asabon',
      'personal-dev-dashboard',
      30
    );

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].conclusion).toBe('failure');
  });

  it('fetchRepositoryWorkflowRuns は再実行前の試行取得が失敗またはレート制限残数不足の場合に incompleteCoverage と warning を返すこと', async () => {
    clearWorkflowRunsCache();
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/attempts/1')) {
        return new Response('Server Error', { status: 500 });
      }
      return new Response(
        JSON.stringify({
          total_count: 1,
          workflow_runs: [
            {
              id: 888,
              workflow_id: 10,
              name: 'CI',
              display_title: 'Rerun cancelled with lookup failure',
              run_number: 51,
              run_attempt: 2,
              event: 'push',
              status: 'completed',
              conclusion: 'cancelled',
              html_url: 'https://github.com/asabon/personal-dev-dashboard/actions/runs/888',
              head_branch: 'main',
              head_sha: '1234567890abcdef',
              actor: { login: 'asabon', avatar_url: '' },
              created_at: '2026-09-25T10:00:00Z',
              updated_at: '2026-09-25T10:10:00Z',
            },
          ],
        }),
        { status: 200 }
      );
    });

    const failedLookupResult = await fetchRepositoryWorkflowRuns(
      TEST_PAT,
      'asabon',
      'personal-dev-dashboard',
      30
    );

    expect(failedLookupResult.incompleteCoverage).toBe(true);
    expect(failedLookupResult.warning).toContain('再実行前の試行履歴の取得に失敗しました');

    // レート制限残数が少ない場合（remaining < 100）も incompleteCoverage になること
    clearWorkflowRunsCache();
    const resetEpoch = Math.floor((Date.now() + 600_000) / 1000);
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          total_count: 1,
          workflow_runs: [
            {
              id: 889,
              workflow_id: 10,
              name: 'CI',
              display_title: 'Rerun cancelled with low rate limit',
              run_number: 52,
              run_attempt: 2,
              event: 'push',
              status: 'completed',
              conclusion: 'cancelled',
              html_url: 'https://github.com/asabon/personal-dev-dashboard/actions/runs/889',
              head_branch: 'main',
              head_sha: '1234567890abcdef',
              actor: { login: 'asabon', avatar_url: '' },
              created_at: '2026-09-25T10:00:00Z',
              updated_at: '2026-09-25T10:10:00Z',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'x-ratelimit-remaining': '50',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-reset': String(resetEpoch),
          },
        }
      );
    });

    const lowRateLimitResult = await fetchRepositoryWorkflowRuns(
      TEST_PAT,
      'asabon',
      'personal-dev-dashboard',
      30
    );

    expect(lowRateLimitResult.incompleteCoverage).toBe(true);
    expect(lowRateLimitResult.warning).toContain('レート制限残数が少ないため');
  });

  it('fetchViewerOwnedRepositoriesAndPRs は 1 回の GraphQL クエリで自分の全リポジトリと Open PR を一括取得すること', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: {
            viewer: {
              repositories: {
                nodes: [
                  {
                    name: 'personal-dev-dashboard',
                    nameWithOwner: 'asabon/personal-dev-dashboard',
                    isPrivate: false,
                    isFork: false,
                    pushedAt: '2026-11-07T10:00:00Z',
                    updatedAt: '2026-11-07T10:05:00Z',
                    owner: { login: 'asabon' },
                    pullRequests: {
                      nodes: [
                        {
                          id: 'pr-10',
                          number: 10,
                          title: 'feat: smart polling',
                          url: 'https://github.com/asabon/personal-dev-dashboard/pull/10',
                          updatedAt: '2026-11-07T10:00:00Z',
                          headRefName: 'feature/smart-polling',
                          author: { login: 'asabon', avatarUrl: '' },
                          commits: {
                            nodes: [
                              {
                                commit: {
                                  oid: 'abcdef1234567',
                                  abbreviatedOid: 'abcdef1',
                                  statusCheckRollup: {
                                    state: 'SUCCESS',
                                    contexts: { nodes: [] },
                                  },
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        }),
        { status: 200 }
      );
    });
    globalThis.fetch = fetchMock;

    const repos = await fetchViewerOwnedRepositoriesAndPRs(TEST_PAT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(repos).toHaveLength(1);
    expect(repos[0].fullName).toBe('asabon/personal-dev-dashboard');
    expect(repos[0].pushedAt).toBe('2026-11-07T10:00:00Z');
    expect(repos[0].pullRequests).toHaveLength(1);
    expect(repos[0].pullRequests[0].overallCiState).toBe('SUCCESS');
  });

  it('スマート差分スキップ: TTL 経過後でもリポジトリの pushedAt/updatedAt が変化しておらず進行中 Run がない場合は API 通信をスキップすること', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
      clearWorkflowRunsCache();
      recordRepositoryActivity(
        TEST_PAT,
        'asabon/personal-dev-dashboard',
        '2026-11-07T09:00:00Z',
        '2026-11-07T09:05:00Z'
      );

      const fetchMock = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            total_count: 1,
            workflow_runs: [
              {
                id: 1001,
                workflow_id: 10,
                name: 'CI',
                display_title: 'Initial run',
                run_number: 1,
                event: 'push',
                status: 'completed',
                conclusion: 'success',
                html_url: 'https://github.com/asabon/personal-dev-dashboard/actions/runs/1001',
                head_branch: 'main',
                head_sha: '1234567890abcdef',
                actor: { login: 'asabon', avatar_url: '' },
                created_at: '2026-11-07T09:00:00Z',
                updated_at: '2026-11-07T09:02:00Z',
              },
            ],
          }),
          { status: 200 }
        );
      });
      globalThis.fetch = fetchMock;

      // 初回取得: API が 1 回呼ばれる
      const first = await fetchRepositoryWorkflowRuns(
        TEST_PAT,
        'asabon',
        'personal-dev-dashboard'
      );
      expect(first.runs).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // 1分経過（通常の 20秒 TTL は経過済み）だが、pushedAt/updatedAt は変化なし
      vi.advanceTimersByTime(60 * 1000);
      const second = await fetchRepositoryWorkflowRuns(
        TEST_PAT,
        'asabon',
        'personal-dev-dashboard'
      );
      expect(second.runs).toHaveLength(1);
      // 無駄なポーリングが発生せず、fetch 回数は 1 回のままであること
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // 新しい Push が発生して pushedAt が更新された場合は API を再取得すること
      recordRepositoryActivity(
        TEST_PAT,
        'asabon/personal-dev-dashboard',
        '2026-11-07T10:01:30Z',
        '2026-11-07T10:01:30Z'
      );
      await fetchRepositoryWorkflowRuns(TEST_PAT, 'asabon', 'personal-dev-dashboard');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('スマート差分スキップ: 前回取得結果に失敗 Run が含まれる場合は Re-run 解消を検知するためスキップせず再取得すること', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
      clearWorkflowRunsCache();
      recordRepositoryActivity(
        TEST_PAT,
        'asabon/personal-dev-dashboard',
        '2026-11-07T09:00:00Z',
        '2026-11-07T09:05:00Z'
      );

      let conclusion: 'failure' | 'success' = 'failure';
      const fetchMock = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            total_count: 1,
            workflow_runs: [
              {
                id: 2001,
                workflow_id: 10,
                name: 'CI',
                display_title: 'Run with rerun',
                run_number: 2,
                event: 'push',
                status: 'completed',
                conclusion,
                html_url: 'https://github.com/asabon/personal-dev-dashboard/actions/runs/2001',
                head_branch: 'main',
                head_sha: '1234567890abcdef',
                actor: { login: 'asabon', avatar_url: '' },
                created_at: '2026-11-07T09:00:00Z',
                updated_at: '2026-11-07T09:02:00Z',
              },
            ],
          }),
          { status: 200 }
        );
      });
      globalThis.fetch = fetchMock;

      // 初回取得: failure
      const first = await fetchRepositoryWorkflowRuns(
        TEST_PAT,
        'asabon',
        'personal-dev-dashboard'
      );
      expect(first.runs[0].conclusion).toBe('failure');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // GitHub 上で Re-run されて success に変わった（pushedAt は変化なし）
      conclusion = 'success';
      vi.advanceTimersByTime(60 * 1000);

      const second = await fetchRepositoryWorkflowRuns(
        TEST_PAT,
        'asabon',
        'personal-dev-dashboard'
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(second.runs[0].conclusion).toBe('success');
    } finally {
      vi.useRealTimers();
    }
  });

  it('selectActiveRepositoriesForPolling は外部指定リポジトリと直近アクティブな所有リポジトリのみを選出し休眠リポジトリを除外すること', () => {
    const nowMs = new Date('2026-11-07T12:00:00Z').getTime();
    const ownedProjects = [
      {
        owner: 'asabon',
        name: 'active-repo',
        fullName: 'asabon/active-repo',
        isPrivate: false,
        isFork: false,
        pushedAt: '2026-11-06T12:00:00Z', // 1日前
        pullRequests: [],
      },
      {
        owner: 'asabon',
        name: 'old-fork',
        fullName: 'asabon/old-fork',
        isPrivate: false,
        isFork: true,
        pushedAt: '2025-01-01T00:00:00Z', // 古いフォーク（Open PR なし）
        pullRequests: [],
      },
      ...Array.from({ length: 6 }, (_, i) => ({
        owner: 'asabon',
        name: `recent-${i + 1}`,
        fullName: `asabon/recent-${i + 1}`,
        isPrivate: false,
        isFork: false,
        pushedAt: '2026-11-01T00:00:00Z',
        pullRequests: [],
      })),
      {
        owner: 'asabon',
        name: 'dormant-2023',
        fullName: 'asabon/dormant-2023',
        isPrivate: false,
        isFork: false,
        pushedAt: '2023-05-01T00:00:00Z', // 3年前の休眠リポジトリ
        pullRequests: [],
      },
    ];

    const selected = selectActiveRepositoriesForPolling(
      ownedProjects,
      ['external-org/api-server'],
      20,
      nowMs
    );

    expect(selected[0]).toBe('external-org/api-server');
    expect(selected).toContain('asabon/active-repo');
    expect(selected).not.toContain('asabon/old-fork');
    expect(selected).not.toContain('asabon/dormant-2023');
  });
});
