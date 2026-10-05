import React from 'react';
import { AlertCircle } from 'lucide-react';
import { DEMO_RUNNERS } from '../../../data/mockData';
import { RunnersCard } from '../../../components/RunnersCard';
import { fetchAllSelfHostedRunners } from '../../../services/githubApi';
import type { SelfHostedRunner } from '../../../types';
import type { DashboardFeatureDefinition, FeatureCardProps } from '../../types';
import { SELF_HOSTED_RUNNERS_FEATURE_ID } from '../../ids';
import { SelfHostedRunnersSettingsEditor } from './SettingsEditor';

interface RunnerFeatureData {
  runners: SelfHostedRunner[];
  warning?: string;
}

const RunnerFeatureCard: React.FC<FeatureCardProps> = ({ state, isCompact }) => {
  const data = state.data as RunnerFeatureData | null;
  return (
    <RunnersCard
      runners={data?.runners ?? []}
      isLoading={state.isLoading}
      error={state.error || data?.warning || null}
      isCompact={isCompact}
    />
  );
};

export const feature: DashboardFeatureDefinition = {
  id: SELF_HOSTED_RUNNERS_FEATURE_ID,
  defaultEnabled: false,
  legacyEnabledSetting: 'showSelfHostedRunners',
  SettingsEditor: SelfHostedRunnersSettingsEditor,
  Card: RunnerFeatureCard,
  demoData: { runners: DEMO_RUNNERS },
  debugScenarios: [
    {
      id: 'normal',
      label: '全台正常稼働',
      state: {
        data: {
          runners: DEMO_RUNNERS.map((r) => ({ ...r, status: 'online' as const })),
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'warning',
      label: '一部 Offline (警告)',
      state: {
        data: { runners: DEMO_RUNNERS },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'critical',
      label: '全台 Offline (障害)',
      state: {
        data: {
          runners: DEMO_RUNNERS.map((r) => ({ ...r, status: 'offline' as const, busy: false })),
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'empty',
      label: 'ランナー未登録 (0台)',
      state: {
        data: { runners: [] },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'error',
      label: 'API エラー (403)',
      state: {
        data: null,
        error: 'Self-hosted Runner 権限が不足しています (403 Forbidden)',
        isLoading: false,
      },
    },
    {
      id: 'loading',
      label: '読込中 (Loading)',
      state: {
        data: null,
        error: null,
        isLoading: true,
      },
    },
  ],
  loadData: (context) =>
    fetchAllSelfHostedRunners(
      context.pat,
      context.repositories,
      context.monitoredOrgs,
      context.username
    ),
  getAlerts: (data) => {
    const offlineCount = ((data as RunnerFeatureData | null)?.runners ?? []).filter(
      (runner) => runner.status === 'offline'
    ).length;
    return offlineCount > 0
      ? [{
          id: 'self-hosted-runners-offline',
          label: `Runner 停止: ${offlineCount}台`,
          targetId: 'runners-section',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
          tone: 'danger',
        }]
      : [];
  },
};