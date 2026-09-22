import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchActionsUsage, fetchOrgActionsUsage } from './githubApi';

describe('githubApi - Actions 使用量および倍率計算テスト', () => {
  const TEST_PAT = 'ghp_TEST_TOKEN_12345';
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
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
});
