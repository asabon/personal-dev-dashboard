import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAllWorkflowRuns } from '../../../services/githubApi';
import { feature, getWorkflowRunsAlerts } from './feature';
import type { WorkflowRunsFeatureData } from './feature';
import type { WorkflowRunItem } from '../../../types';
import type { FeatureLoadContext } from '../../types';

vi.mock('../../../services/githubApi', () => ({
  fetchAllWorkflowRuns: vi.fn(),
}));

describe('workflowRuns feature module', () => {
  beforeEach(() => vi.clearAllMocks());

  const makeRun = (
    id: number,
    workflowName: string,
    status: WorkflowRunItem['status'],
    conclusion: WorkflowRunItem['conclusion'],
    createdAt = `2026-09-25T10:0${id}:00Z`
  ): WorkflowRunItem => ({
    id,
    repoFullName: 'asabon/personal-dev-dashboard',
    workflowName,
    displayTitle: `run ${id}`,
    runNumber: id,
    event: 'push',
    status,
    conclusion,
    htmlUrl: `https://github.com/asabon/personal-dev-dashboard/actions/runs/${id}`,
    headBranch: 'main',
    shortSha: '1234567',
    actor: { login: 'asabon', avatarUrl: '' },
    createdAt,
    updatedAt: createdAt,
  });

  it('すべてのワークフローが成功している場合はアラートを返さないこと', () => {
    const data: WorkflowRunsFeatureData = {
      runs: [
        makeRun(1, 'CI', 'completed', 'success'),
        makeRun(2, 'Deploy', 'completed', 'skipped'),
      ],
    };
    expect(getWorkflowRunsAlerts(data)).toEqual([]);
  });

  it('過去の実行が失敗していても、同じワークフローの最新実行が成功していればアラートを返さないこと', () => {
    const data: WorkflowRunsFeatureData = {
      runs: [
        makeRun(1, 'CI', 'completed', 'failure', '2026-09-25T10:01:00Z'),
        makeRun(2, 'CI', 'completed', 'success', '2026-09-25T10:05:00Z'),
      ],
    };
    expect(getWorkflowRunsAlerts(data)).toEqual([]);
  });

  it('異なるワークフローで失敗および実行中がある場合に適切なアラートを返すこと', () => {
    const data: WorkflowRunsFeatureData = {
      runs: [
        makeRun(1, 'CI', 'in_progress', null),
        makeRun(2, 'Deploy', 'completed', 'failure'),
        makeRun(3, 'Audit', 'completed', 'timed_out'),
      ],
    };

    const alerts = getWorkflowRunsAlerts(data);
    expect(alerts).toMatchObject([
      {
        id: 'workflow-runs-failed',
        label: 'Actions 失敗: 2件',
        targetId: 'workflow-runs-section',
        tone: 'danger',
      },
      {
        id: 'workflow-runs-running',
        label: 'Actions 実行中: 1件',
        targetId: 'workflow-runs-section',
        tone: 'warning',
      },
    ]);
  });

  it('loadData が context の pat と repositories を使って fetchAllWorkflowRuns を呼び出すこと', async () => {
    const mockRuns = [makeRun(1, 'CI', 'completed', 'success')];
    vi.mocked(fetchAllWorkflowRuns).mockResolvedValue({ runs: mockRuns });

    const context: FeatureLoadContext = {
      pat: 'ghp_test',
      username: 'asabon',
      repositories: ['asabon/personal-dev-dashboard', 'octocat/frontend-app'],
      monitoredOrgs: [],
      settings: { enabled: true },
    };

    const result = await feature.loadData(context);
    expect(fetchAllWorkflowRuns).toHaveBeenCalledWith('ghp_test', [
      'asabon/personal-dev-dashboard',
      'octocat/frontend-app',
    ]);
    expect(result).toEqual({ runs: mockRuns });
  });
});
