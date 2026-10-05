import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { ActionsUsageCard } from '../../../components/ActionsUsageCard';
import {
  fetchActionsUsage,
  fetchOrgActionsUsage,
  fetchUserOrganizations,
} from '../../../services/githubApi';
import type {
  ActionsUsage,
  ActionsUsageAccount,
  ActionsUsageItem,
} from '../../../types';
import type {
  DashboardFeatureDefinition,
  FeatureAlert,
  FeatureCardProps,
  FeatureLoadContext,
} from '../../types';
import { ACTIONS_USAGE_FEATURE_ID } from '../../ids';
import { DEMO_ORG_USAGE, DEMO_USAGE, DEMO_USAGE_MAP } from '../../../data/mockData';

export interface ActionsUsageFeatureData {
  accounts: ActionsUsageAccount[];
  usageMap: Record<string, ActionsUsageItem>;
  userError: string | null;
  discoveredOrgs: string[];
}

const demoData: ActionsUsageFeatureData = {
  accounts: [
    { name: 'demo-developer', type: 'user' },
    { name: 'demo-org', type: 'org' },
  ],
  usageMap: DEMO_USAGE_MAP,
  userError: null,
  discoveredOrgs: [DEMO_ORG_USAGE.accountName || 'demo-org'],
};

export async function loadActionsUsage(
  context: FeatureLoadContext
): Promise<ActionsUsageFeatureData> {
  const previousData = context.previousData as ActionsUsageFeatureData | null;
  let discoveredOrgs = previousData?.discoveredOrgs ?? [];
  let orgNames = Array.from(new Set([...(context.monitoredOrgs || []), ...discoveredOrgs]))
    .filter((org) => org && org !== context.username);

  if (orgNames.length === 0) {
    try {
      discoveredOrgs = await fetchUserOrganizations(context.pat);
    } catch (error) {
      console.warn('Failed to discover user orgs:', error);
      discoveredOrgs = [];
    }
    orgNames = discoveredOrgs.filter((org) => org && org !== context.username);
  }

  const accounts: ActionsUsageAccount[] = [
    { name: context.username, type: 'user' },
    ...orgNames.map((name) => ({ name, type: 'org' as const })),
  ];
  const usageMap: Record<string, ActionsUsageItem> = {};
  let userError: string | null = null;

  try {
    const usage = await fetchActionsUsage(context.pat, context.username);
    usageMap[context.username] = { usage, error: null };
  } catch (error) {
    userError = error instanceof Error ? error.message : 'Actions 使用量の取得に失敗しました';
    usageMap[context.username] = { usage: null, error: userError };
  }

  await Promise.allSettled(
    orgNames.map(async (org) => {
      try {
        const usage = await fetchOrgActionsUsage(context.pat, org);
        usageMap[org] = { usage, error: null };
      } catch (error) {
        usageMap[org] = {
          usage: null,
          error: error instanceof Error ? error.message : 'Organization の使用量取得に失敗しました',
        };
      }
    })
  );

  return { accounts, usageMap, userError, discoveredOrgs };
}

export function getActionsUsageAlerts(data: unknown): FeatureAlert[] {
  const usageData = data as ActionsUsageFeatureData | null;
  if (!usageData) return [];

  const usages = Object.values(usageData.usageMap)
    .map((item) => item.usage)
    .filter((usage): usage is NonNullable<typeof usage> => Boolean(usage));
  const warningUsage = usages.find((usage) => usage.usagePercentage >= 85);
  if (!warningUsage) return [];

  const isCritical = usages.some((usage) => usage.usagePercentage >= 95);
  const remainingPercent = Math.max(0, 100 - warningUsage.usagePercentage);
  return [{
    id: 'actions-usage-warning',
    label: `Actions 残${remainingPercent}%${warningUsage.accountName ? ` (${warningUsage.accountName})` : ''}`,
    targetId: 'actions-usage-section',
    icon: isCritical
      ? <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
      : <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
    tone: isCritical ? 'danger' : 'warning',
  }];
}

const ActionsUsageFeatureCard: React.FC<FeatureCardProps> = ({ state, isCompact }) => {
  const data = state.data as ActionsUsageFeatureData | null;
  return (
    <ActionsUsageCard
      accounts={data?.accounts ?? []}
      usageMap={data?.usageMap ?? {}}
      isLoading={state.isLoading}
      isCompact={isCompact}
      usage={data?.usageMap[data.accounts[0]?.name]?.usage ?? null}
      error={data?.userError ?? state.error}
    />
  );
};

function createDebugUsageData(percentage: number, accountName = 'demo-developer'): ActionsUsageFeatureData {
  const usage: ActionsUsage = {
    accountName,
    accountType: 'user',
    totalMinutesUsed: Math.round(2000 * (percentage / 100)),
    includedMinutes: 2000,
    usagePercentage: percentage,
    breakdown: { ubuntu: Math.round(2000 * (percentage / 100)), macOS: 0, windows: 0 },
    lastUpdated: new Date().toISOString(),
  };
  return {
    accounts: [{ name: accountName, type: 'user' }],
    usageMap: { [accountName]: { usage, error: null } },
    userError: null,
    discoveredOrgs: [],
  };
}

const actionsUsageDemoData = {
  ...demoData,
  usageMap: {
    ...DEMO_USAGE_MAP,
    'demo-developer': { usage: DEMO_USAGE, error: null },
  },
};

export const feature: DashboardFeatureDefinition = {
  id: ACTIONS_USAGE_FEATURE_ID,
  defaultEnabled: true,
  alwaysEnabled: true,
  Card: ActionsUsageFeatureCard,
  loadData: loadActionsUsage,
  getAlerts: getActionsUsageAlerts,
  demoData: actionsUsageDemoData,
  debugScenarios: [
    {
      id: 'normal',
      label: '通常・余裕 (28%)',
      state: { data: actionsUsageDemoData, error: null, isLoading: false },
    },
    {
      id: 'warning',
      label: '警告域 (85% / 残15%)',
      state: { data: createDebugUsageData(85), error: null, isLoading: false },
    },
    {
      id: 'critical-alert',
      label: '警戒域 (95% / 残5%)',
      state: { data: createDebugUsageData(95), error: null, isLoading: false },
    },
    {
      id: 'critical',
      label: '上限到達 (100% / 残0%)',
      state: { data: createDebugUsageData(100), error: null, isLoading: false },
    },
    {
      id: 'overage',
      label: '上限超過 (115%)',
      state: { data: createDebugUsageData(115), error: null, isLoading: false },
    },
    {
      id: 'org-exhausted',
      label: '組織のみ上限到達 (個人28% / 組織100%)',
      state: {
        data: {
          accounts: [
            { name: 'demo-developer', type: 'user' },
            { name: 'demo-org', type: 'org' },
          ],
          usageMap: {
            'demo-developer': { usage: DEMO_USAGE, error: null },
            'demo-org': {
              usage: {
                accountName: 'demo-org',
                accountType: 'org',
                totalMinutesUsed: 2000,
                includedMinutes: 2000,
                usagePercentage: 100,
                breakdown: { ubuntu: 1800, macOS: 20, windows: 0 },
                lastUpdated: new Date().toISOString(),
              },
              error: null,
            },
          },
          userError: null,
          discoveredOrgs: ['demo-org'],
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'empty',
      label: '未使用 (0%)',
      state: { data: createDebugUsageData(0), error: null, isLoading: false },
    },
    {
      id: 'error',
      label: 'API エラー (403 権限不足)',
      state: {
        data: {
          accounts: [{ name: 'demo-developer', type: 'user' }],
          usageMap: {
            'demo-developer': { usage: null, error: 'Resource not accessible by personal access token' },
          },
          userError: 'Resource not accessible by personal access token',
          discoveredOrgs: [],
        },
        error: 'Actions 使用量の取得に失敗しました',
        isLoading: false,
      },
    },
    {
      id: 'loading',
      label: '読込中 (Loading)',
      state: { data: null, error: null, isLoading: true },
    },
  ],
};
