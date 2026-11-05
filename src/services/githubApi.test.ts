import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  clearWorkflowRunsCache,
  fetchActionsUsage,
  fetchAllWorkflowRuns,
  fetchOrgActionsUsage,
  fetchRepositoryWorkflowRuns,
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
});
