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
      id: 'running-mixed',
      label: '全台Online (待機＋実行中混在)',
      state: {
        data: {
          runners: [
            { ...DEMO_RUNNERS[0], status: 'online' as const, busy: false },
            { ...DEMO_RUNNERS[1], status: 'online' as const, busy: true },
            { ...DEMO_RUNNERS[2], status: 'online' as const, busy: false },
          ],
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'all-idle',
      label: '全台Online (全待機・0台Running)',
      state: {
        data: {
          runners: DEMO_RUNNERS.map((r) => ({ ...r, status: 'online' as const, busy: false })),
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'all-busy',
      label: '全台Online (全台Running・高負荷)',
      state: {
        data: {
          runners: DEMO_RUNNERS.map((r) => ({ ...r, status: 'online' as const, busy: true })),
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'offline-running',
      label: '一部Offline ＋ 実行中あり (警告)',
      state: {
        data: {
          runners: [
            { ...DEMO_RUNNERS[0], status: 'online' as const, busy: false },
            { ...DEMO_RUNNERS[1], status: 'online' as const, busy: true },
            { ...DEMO_RUNNERS[2], status: 'offline' as const, busy: false },
          ],
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'offline-idle',
      label: '一部Offline ＋ 待機中のみ (警告)',
      state: {
        data: {
          runners: [
            { ...DEMO_RUNNERS[0], status: 'online' as const, busy: false },
            { ...DEMO_RUNNERS[1], status: 'online' as const, busy: false },
            { ...DEMO_RUNNERS[2], status: 'offline' as const, busy: false },
          ],
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'all-offline',
      label: '全台Offline (全台停止・障害)',
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
      label: 'API エラー (403 権限不足)',
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
