import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ActionsStatusCard, selectAttentionWorkflowRuns } from './ActionsStatusCard';
import type { WorkflowRunItem } from '../types';

describe('ActionsStatusCard', () => {
  const passedReleaseRun: WorkflowRunItem = {
    id: 101,
    repoFullName: 'asabon/personal-dev-dashboard',
    workflowName: 'Deploy to GitHub Pages',
    displayTitle: 'Release v0.4.0',
    runNumber: 38,
    event: 'release',
    status: 'completed',
    conclusion: 'success',
    htmlUrl: 'https://github.com/asabon/personal-dev-dashboard/actions/runs/101',
    headBranch: 'v0.4.0',
    shortSha: '8f4e2a1',
    actor: { login: 'asabon', avatarUrl: '' },
    createdAt: '2026-09-25T11:40:00Z',
    updatedAt: '2026-09-25T11:45:00Z',
  };

  const failedMainRun: WorkflowRunItem = {
    id: 102,
    repoFullName: 'octocat/api-gateway',
    workflowName: 'Main CI',
    displayTitle: 'Merge pull request #89',
    runNumber: 94,
    event: 'push',
    status: 'completed',
    conclusion: 'failure',
    htmlUrl: 'https://github.com/octocat/api-gateway/actions/runs/102',
    headBranch: 'main',
    shortSha: 'c4d5e6f',
    actor: { login: 'bob', avatarUrl: '' },
    createdAt: '2026-09-25T11:30:00Z',
    updatedAt: '2026-09-25T11:35:00Z',
  };

  const runningPrRun: WorkflowRunItem = {
    id: 103,
    repoFullName: 'octocat/frontend-app',
    workflowName: 'E2E Playwright',
    displayTitle: 'feat: OAuth login flow',
    runNumber: 142,
    event: 'pull_request',
    status: 'in_progress',
    conclusion: null,
    htmlUrl: 'https://github.com/octocat/frontend-app/actions/runs/103',
    headBranch: 'feat/oauth-flow',
    shortSha: 'a1b2c3d',
    actor: { login: 'alice', avatarUrl: '' },
    createdAt: '2026-09-25T11:50:00Z',
    updatedAt: '2026-09-25T11:52:00Z',
  };

  it('実行中および失敗のワークフローのみが表示され、成功済みのワークフローは一覧から除外されること', () => {
    render(
      <ActionsStatusCard
        runs={[passedReleaseRun, failedMainRun, runningPrRun]}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('Actions Status')).toBeInTheDocument();
    // 表示対象は Running (1件) + Failed (1件) の計2件
    expect(screen.getByText('2件')).toBeInTheDocument();
    expect(screen.getByText('1 Running')).toBeInTheDocument();
    expect(screen.getByText('1 Failed')).toBeInTheDocument();

    // 実行中と失敗は表示される
    expect(screen.getByText('E2E Playwright')).toBeInTheDocument();
    expect(screen.getByText('Main CI')).toBeInTheDocument();

    // 成功済みは表示されない
    expect(screen.queryByText('Deploy to GitHub Pages')).not.toBeInTheDocument();
  });

  it('失敗したワークフローが再実行・後続Runで成功した場合、過去の失敗は消えて All Passed になること', () => {
    const recoveredMainRun: WorkflowRunItem = {
      ...failedMainRun,
      id: 104,
      runNumber: 95,
      displayTitle: 'fix: resolve build error',
      status: 'completed',
      conclusion: 'success',
      createdAt: '2026-09-25T11:55:00Z',
      updatedAt: '2026-09-25T11:58:00Z',
    };

    const attention = selectAttentionWorkflowRuns([failedMainRun, recoveredMainRun]);
    expect(attention).toEqual([]);

    render(
      <ActionsStatusCard
        runs={[failedMainRun, recoveredMainRun]}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('0件')).toBeInTheDocument();
    const badge = screen.getByText('All Passed');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.inline-flex')).toHaveClass('text-emerald-400');
    expect(screen.queryByText('Main CI')).not.toBeInTheDocument();
    expect(
      screen.getByText('現在、実行中または失敗状態の Actions はありません')
    ).toBeInTheDocument();
  });

  it('簡易表示モード（isCompact=true）では初期状態で折りたたまれ、クリックで展開できること', () => {
    render(
      <ActionsStatusCard
        runs={[failedMainRun]}
        isLoading={false}
        error={null}
        isCompact={true}
      />
    );

    expect(screen.queryByText('Main CI')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Actions Status'));
    expect(screen.getByText('Main CI')).toBeInTheDocument();
  });
});
