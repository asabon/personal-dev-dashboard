import React from 'react';
import { AlertCircle, Loader2, XCircle } from 'lucide-react';
import {
  ActionsStatusCard,
  isWorkflowRunActive,
  isWorkflowRunFailed,
  selectAttentionWorkflowRuns,
} from '../../../components/ActionsStatusCard';
import { DEMO_WORKFLOW_RUNS } from '../../../data/mockData';
import { fetchAllWorkflowRuns } from '../../../services/githubApi';
import type { WorkflowRunItem } from '../../../types';
import { WORKFLOW_RUNS_FEATURE_ID } from '../../ids';
import type {
  DashboardFeatureDefinition,
  FeatureAlert,
  FeatureCardProps,
} from '../../types';

export interface WorkflowRunsFeatureData {
  runs: WorkflowRunItem[];
  warning?: string;
  incompleteCoverage?: boolean;
}

const healthyRuns: WorkflowRunItem[] = DEMO_WORKFLOW_RUNS.map((run) => ({
  ...run,
  status: 'completed',
  conclusion: 'success',
}));

const inProgressRuns: WorkflowRunItem[] = DEMO_WORKFLOW_RUNS.map((run, idx) =>
  idx < 2
    ? { ...run, status: 'in_progress', conclusion: null }
    : { ...run, status: 'completed', conclusion: 'success' }
);

const criticalRuns: WorkflowRunItem[] = DEMO_WORKFLOW_RUNS.map((run) => ({
  ...run,
  status: 'completed',
  conclusion: 'failure',
}));

export function getWorkflowRunsAlerts(data: unknown): FeatureAlert[] {
  const featureData = data as WorkflowRunsFeatureData | null;
  const rawRuns = featureData?.runs ?? [];
  const attentionRuns = selectAttentionWorkflowRuns(rawRuns);
  const failedCount = attentionRuns.filter(isWorkflowRunFailed).length;
  const runningCount = attentionRuns.filter(isWorkflowRunActive).length;

  const alerts: FeatureAlert[] = [];

  if (failedCount > 0) {
    alerts.push({
      id: 'workflow-runs-failed',
      label: `Actions 失敗: ${failedCount}件`,
      targetId: 'workflow-runs-section',
      icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />,
      tone: 'danger',
    });
  }

  if (runningCount > 0) {
    alerts.push({
      id: 'workflow-runs-running',
      label: `Actions 実行中: ${runningCount}件`,
      targetId: 'workflow-runs-section',
      icon: <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
      tone: 'warning',
    });
  }

  if (featureData?.warning || featureData?.incompleteCoverage) {
    alerts.push({
      id: 'workflow-runs-unavailable',
      label: 'Actions 取得不可',
      targetId: 'workflow-runs-section',
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
      tone: 'warning',
    });
  }

  return alerts;
}

const WorkflowRunsFeatureCard: React.FC<FeatureCardProps> = ({ state, isCompact }) => {
  const data = state.data as WorkflowRunsFeatureData | null;
  return (
    <ActionsStatusCard
      runs={data?.runs ?? []}
      isLoading={state.isLoading}
      error={state.error || data?.warning || null}
      incompleteCoverage={Boolean(data?.incompleteCoverage)}
      isCompact={isCompact}
    />
  );
};

export const feature: DashboardFeatureDefinition = {
  id: WORKFLOW_RUNS_FEATURE_ID,
  defaultEnabled: true,
  alwaysEnabled: true,
  Card: WorkflowRunsFeatureCard,
  loadData: (context) => fetchAllWorkflowRuns(context.pat, context.repositories),
  getAlerts: getWorkflowRunsAlerts,
  demoData: { runs: DEMO_WORKFLOW_RUNS },
  debugScenarios: [
    {
      id: 'normal',
      category: '通常・稼働状況',
      label: '全 Actions 成功 (健全)',
      state: {
        data: { runs: healthyRuns },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'in-progress',
      category: '通常・稼働状況',
      label: 'Actions 実行中あり (Running)',
      state: {
        data: { runs: inProgressRuns },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'warning',
      category: '通常・稼働状況',
      label: '失敗・進行中混在 (警告)',
      state: {
        data: { runs: DEMO_WORKFLOW_RUNS },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'critical',
      category: '通常・稼働状況',
      label: '全 Actions 失敗 (多重障害)',
      state: {
        data: { runs: criticalRuns },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'empty',
      category: '履歴なし・異常',
      label: '実行履歴なし (0件)',
      state: {
        data: { runs: [] },
        error: null,
        isLoading: false,
      },
    },
    {
      id: 'error',
      category: '履歴なし・異常',
      label: 'API 取得エラー (403)',
      state: {
        data: {
          runs: [],
          warning: 'Actions 実行履歴の取得に失敗しました (403 Forbidden)',
          incompleteCoverage: true,
        },
        error: 'Actions 実行履歴の取得に失敗しました (403 Forbidden)',
        isLoading: false,
      },
    },
    {
      id: 'loading',
      category: '履歴なし・異常',
      label: '読込中 (Loading)',
      state: {
        data: null,
        error: null,
        isLoading: true,
      },
    },
  ],
};

