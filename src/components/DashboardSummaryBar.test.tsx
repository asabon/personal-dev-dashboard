import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DashboardSummaryBar } from './DashboardSummaryBar';
import type { RepositoryDashboardData } from '../types';

describe('DashboardSummaryBar', () => {
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

  it('renders "異常なし" when everything is healthy', () => {
    render(
      <DashboardSummaryBar
        projects={[dummyRepoSuccess]}
      />
    );

    expect(screen.getByText('異常なし')).toBeDefined();
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
      />
    );

    const alertBtn = screen.getByText('CI 失敗: 1件');
    expect(alertBtn).toBeDefined();

    fireEvent.click(alertBtn);
    expect(scrollIntoViewMock).toHaveBeenCalled();

    document.body.removeChild(dummyEl);
  });

  it('renders feature alerts and scrolls to the feature card', () => {
    const scrollIntoViewMock = vi.fn();
    const dummyEl = document.createElement('div');
    dummyEl.id = 'actions-usage-section';
    dummyEl.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(dummyEl);

    render(
      <DashboardSummaryBar
        projects={[dummyRepoSuccess]}
        featureAlerts={[{
          id: 'runner-offline',
          label: 'Actions 残10% (my-org)',
          targetId: 'actions-usage-section',
          icon: <span>R</span>,
          tone: 'warning',
        }]}
      />
    );

    expect(screen.getByText('Actions 残10% (my-org)')).toBeDefined();
    fireEvent.click(screen.getByText('Actions 残10% (my-org)'));
    expect(scrollIntoViewMock).toHaveBeenCalled();
    document.body.removeChild(dummyEl);
  });
});
