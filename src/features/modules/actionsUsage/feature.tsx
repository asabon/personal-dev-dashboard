import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { ActionsUsageCard } from '../../../components/ActionsUsageCard';
import {
  fetchActionsUsage,
  fetchOrgActionsUsage,
  fetchUserOrganizations,
} from '../../../services/githubApi';
import type {
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
    discoveredOrgs = await fetchUserOrganizations(context.pat);
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

export const feature: DashboardFeatureDefinition = {
  id: ACTIONS_USAGE_FEATURE_ID,
  defaultEnabled: true,
  alwaysEnabled: true,
  Card: ActionsUsageFeatureCard,
  loadData: loadActionsUsage,
  getAlerts: getActionsUsageAlerts,
  demoData: {
    ...demoData,
    usageMap: {
      ...DEMO_USAGE_MAP,
      'demo-developer': { usage: DEMO_USAGE, error: null },
    },
  },
};