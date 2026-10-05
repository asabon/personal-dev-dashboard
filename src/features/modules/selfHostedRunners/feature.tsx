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
      id: 'all-idle',
      category: '全台 Online',
      label: '全台待機 (0台Running)',
      state: {
        data: {
          runners: DEMO_RUNNERS.map((r) => ({ ...r, status: 'online' as const, busy: false })),
        },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'running-mixed',
      category: '全台 Online',
      label: '待機＋実行中混在 (1台Running)',
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
      id: 'all-busy',
      category: '全台 Online',
      label: '全台実行中 (3台Running・高負荷)',
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
      category: '一部 Offline',
      label: '実行中あり (1台Running, 1台Offline)',
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
      category: '一部 Offline',
      label: '待機中のみ (0台Running, 1台Offline)',
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
      category: '全台 Offline・異常',
      label: '全台停止 (3台Offline・障害)',
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
      category: '全台 Offline・異常',
      label: 'ランナー未登録 (0台)',
      state: {
        data: { runners: [] },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'error',
      category: '全台 Offline・異常',
      label: 'API エラー (403 権限不足)',
      state: {
        data: null,
        error: 'Self-hosted Runner 権限が不足しています (403 Forbidden)',
        isLoading: false,
      },
    },
    {
      id: 'loading',
      category: '全台 Offline・異常',
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
