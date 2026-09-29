import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchActionsUsage,
  fetchOrgActionsUsage,
  fetchUserOrganizations,
} from '../../../services/githubApi';
import { getActionsUsageAlerts, loadActionsUsage } from './feature';
import type { ActionsUsageFeatureData } from './feature';
import type { ActionsUsage } from '../../../types';
import type { FeatureLoadContext } from '../../types';

vi.mock('../../../services/githubApi', () => ({
  fetchActionsUsage: vi.fn(),
  fetchOrgActionsUsage: vi.fn(),
  fetchUserOrganizations: vi.fn(),
}));

describe('Actions usage feature alerts', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeUsage = (accountName: string): ActionsUsage => ({
    totalMinutesUsed: 500,
    includedMinutes: 2000,
    usagePercentage: 25,
    breakdown: { ubuntu: 500, macOS: 0, windows: 0 },
    lastUpdated: '2026-09-30T00:00:00Z',
    accountName,
    accountType: accountName === 'acme' ? 'org' : 'user',
  });

  const makeData = (usagePercentage: number, accountName = 'octocat'): ActionsUsageFeatureData => ({
    accounts: [{ name: accountName, type: 'user' }],
    usageMap: {
      [accountName]: {
        usage: {
          totalMinutesUsed: usagePercentage * 20,
          includedMinutes: 2000,
          usagePercentage,
          breakdown: { ubuntu: usagePercentage * 20, macOS: 0, windows: 0 },
          lastUpdated: '2026-09-30T00:00:00Z',
          accountName,
          accountType: 'user',
        },
        error: null,
      },
    },
    userError: null,
    discoveredOrgs: [],
  });

  it('85% 以上で warning alert を返すこと', () => {
    expect(getActionsUsageAlerts(makeData(85))).toMatchObject([
      { label: 'Actions 残15% (octocat)', tone: 'warning', targetId: 'actions-usage-section' },
    ]);
  });

  it('95% 以上で danger alert を返すこと', () => {
    expect(getActionsUsageAlerts(makeData(95))).toMatchObject([
      { label: 'Actions 残5% (octocat)', tone: 'danger', targetId: 'actions-usage-section' },
    ]);
  });

  it('85% 未満では alert を返さないこと', () => {
    expect(getActionsUsageAlerts(makeData(84))).toEqual([]);
  });

  it('個人と Org の使用量を取得し、検出した Org を次回更新で再利用すること', async () => {
    vi.mocked(fetchUserOrganizations).mockResolvedValue(['acme', 'octocat']);
    vi.mocked(fetchActionsUsage).mockResolvedValue(makeUsage('octocat'));
    vi.mocked(fetchOrgActionsUsage).mockResolvedValue(makeUsage('acme'));

    const context: FeatureLoadContext = {
      pat: 'test-pat',
      username: 'octocat',
      repositories: [],
      monitoredOrgs: [],
      settings: { enabled: true },
    };

    const firstLoad = await loadActionsUsage(context);
    expect(firstLoad.accounts).toEqual([
      { name: 'octocat', type: 'user' },
      { name: 'acme', type: 'org' },
    ]);
    expect(firstLoad.usageMap.octocat.usage?.accountName).toBe('octocat');
    expect(firstLoad.usageMap.acme.usage?.accountType).toBe('org');

    await loadActionsUsage({ ...context, previousData: firstLoad });
    expect(fetchUserOrganizations).toHaveBeenCalledOnce();
  });

  it('Organization の検出に失敗しても個人の使用量を取得すること', async () => {
    vi.mocked(fetchUserOrganizations).mockRejectedValue(new Error('権限がありません'));
    vi.mocked(fetchActionsUsage).mockResolvedValue(makeUsage('octocat'));

    const context: FeatureLoadContext = {
      pat: 'test-pat',
      username: 'octocat',
      repositories: [],
      monitoredOrgs: [],
      settings: { enabled: true },
    };

    const data = await loadActionsUsage(context);

    expect(data.accounts).toEqual([{ name: 'octocat', type: 'user' }]);
    expect(data.usageMap.octocat.usage?.accountName).toBe('octocat');
    expect(data.discoveredOrgs).toEqual([]);
    expect(fetchActionsUsage).toHaveBeenCalledWith('test-pat', 'octocat');
  });
});
