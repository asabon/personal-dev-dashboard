import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardSummaryBar } from './DashboardSummaryBar';
import type { RepositoryDashboardData, ActionsUsage, SelfHostedRunner } from '../types';

describe('DashboardSummaryBar', () => {
  const dummyUsage: ActionsUsage = {
    totalMinutesUsed: 500,
    includedMinutes: 2000,
    usagePercentage: 25,
    breakdown: { ubuntu: 500, macOS: 0, windows: 0 },
    lastUpdated: '2026-09-23T00:00:00Z',
  };

  const dummyRepoSuccess: RepositoryDashboardData = {
    owner: 'test',
    name: 'repo-success',
    fullName: 'test/repo-success',
    isPrivate: false,
    pullRequests: [
      {
        id: 'pr-1',
        number: 1,
        title: 'Fix issue',
        url: 'https://github.com/test/repo-success/pull/1',
        updatedAt: '2026-09-23T00:00:00Z',
        author: { login: 'alice', avatarUrl: '' },
        headBranch: 'feature/fix',
        headSha: '1234567890',
        shortSha: '1234567',
        overallCiState: 'SUCCESS',
        checks: [],
      },
    ],
  };

  const dummyRepoFailed: RepositoryDashboardData = {
    owner: 'test',
    name: 'repo-failed',
    fullName: 'test/repo-failed',
    isPrivate: false,
    pullRequests: [
      {
        id: 'pr-2',
        number: 2,
        title: 'Broken test',
        url: 'https://github.com/test/repo-failed/pull/2',
        updatedAt: '2026-09-23T00:00:00Z',
        author: { login: 'bob', avatarUrl: '' },
        headBranch: 'bug/test',
        headSha: 'abcdef1234',
        shortSha: 'abcdef1',
        overallCiState: 'FAILURE',
        checks: [],
      },
    ],
  };

  const dummyRunnerOffline: SelfHostedRunner = {
    id: 1,
    name: 'home-server',
    os: 'Linux',
    status: 'offline',
    busy: false,
    labels: ['self-hosted'],
    scopeType: 'org',
    scopeName: 'test-org',
  };

  it('renders "全リポジトリ・Actions正常" when everything is healthy', () => {
    render(
      <DashboardSummaryBar
        projects={[dummyRepoSuccess]}
        usage={dummyUsage}
        runners={[]}
        showRunners={false}
      />
    );

    expect(screen.getByText('全リポジトリ・Actions正常')).toBeDefined();
  });

  it('renders CI failure button and scrolls when clicked', () => {
    const scrollIntoViewMock = vi.fn();
    const dummyEl = document.createElement('div');
    dummyEl.id = 'repo-test-repo-failed';
    dummyEl.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(dummyEl);

    render(
      <DashboardSummaryBar
        projects={[dummyRepoSuccess, dummyRepoFailed]}
        usage={dummyUsage}
        runners={[]}
        showRunners={false}
      />
    );

    const alertBtn = screen.getByText('CI 失敗: 1件');
    expect(alertBtn).toBeDefined();

    fireEvent.click(alertBtn);
    expect(scrollIntoViewMock).toHaveBeenCalled();

    document.body.removeChild(dummyEl);
  });

  it('renders usage warning when usage exceeds 85%', () => {
    const highUsage: ActionsUsage = {
      ...dummyUsage,
      totalMinutesUsed: 1800,
      usagePercentage: 90,
    };

    render(
      <DashboardSummaryBar
        projects={[dummyRepoSuccess]}
        usage={highUsage}
        runners={[]}
        showRunners={false}
      />
    );

    expect(screen.getByText('Actions残り僅か (90%)')).toBeDefined();
  });

  it('renders runner offline warning when runner is down and showRunners is true', () => {
    render(
      <DashboardSummaryBar
        projects={[dummyRepoSuccess]}
        usage={dummyUsage}
        runners={[dummyRunnerOffline]}
        showRunners={true}
      />
    );

    expect(screen.getByText('Runner 停止: 1台')).toBeDefined();
  });
});
