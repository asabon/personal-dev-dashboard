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