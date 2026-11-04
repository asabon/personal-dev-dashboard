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

    const { rerender } = render(
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

    // 同一 Run ID / runNumber の再実行（re-run）で成功に更新された場合も消えること
    const rerunRecovered: WorkflowRunItem = {
      ...failedMainRun,
      id: 102,
      runNumber: 94,
      status: 'completed',
      conclusion: 'success',
      updatedAt: '2026-09-25T12:00:00Z',
    };
    rerender(
      <ActionsStatusCard
        runs={[rerunRecovered]}
        isLoading={false}
        error={null}
      />
    );
    expect(screen.queryByText('Main CI')).not.toBeInTheDocument();
    expect(screen.getByText('All Passed')).toBeInTheDocument();
  });

  it('同一リポジトリ・同一ワークフローでも異なる PR ブランチの失敗は別ブランチの成功で消えないこと', () => {
    const prBranchAFailed: WorkflowRunItem = {
      ...runningPrRun,
      id: 201,
      runNumber: 150,
      headBranch: 'feat/branch-a',
      status: 'completed',
      conclusion: 'failure',
      createdAt: '2026-09-25T11:10:00Z',
      updatedAt: '2026-09-25T11:15:00Z',
    };
    const prBranchBPassed: WorkflowRunItem = {
      ...runningPrRun,
      id: 202,
      runNumber: 151,
      headBranch: 'feat/branch-b',
      status: 'completed',
      conclusion: 'success',
      createdAt: '2026-09-25T11:20:00Z',
      updatedAt: '2026-09-25T11:25:00Z',
    };

    const attention = selectAttentionWorkflowRuns([prBranchAFailed, prBranchBPassed]);
    expect(attention).toHaveLength(1);
    expect(attention[0].id).toBe(201);
    expect(attention[0].headBranch).toBe('feat/branch-a');
  });

  it('古い実行がまだ in_progress の場合、後続の短い実行が先に success 完了しても in_progress の実行が隠れないこと', () => {
    const olderInProgress: WorkflowRunItem = {
      ...failedMainRun,
      id: 301,
      runNumber: 100,
      status: 'in_progress',
      conclusion: null,
      createdAt: '2026-09-25T11:00:00Z',
      updatedAt: '2026-09-25T11:05:00Z',
    };
    const newerSuccess: WorkflowRunItem = {
      ...failedMainRun,
      id: 302,
      runNumber: 101,
      status: 'completed',
      conclusion: 'success',
      createdAt: '2026-09-25T11:02:00Z',
      updatedAt: '2026-09-25T11:03:00Z',
    };

    const attention = selectAttentionWorkflowRuns([olderInProgress, newerSuccess]);
    expect(attention).toHaveLength(1);
    expect(attention[0].id).toBe(301);
  });

  it('読込中（isLoading=true）の場合はヘッダーの All Passed バッジを抑制すること', () => {
    render(
      <ActionsStatusCard
        runs={[]}
        isLoading={true}
        error={null}
      />
    );

    expect(screen.queryByText('All Passed')).not.toBeInTheDocument();
    expect(screen.getByText('直近の Actions 実行状況を確認中...')).toBeInTheDocument();
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
