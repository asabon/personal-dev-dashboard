import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RepositoriesCard } from './RepositoriesCard';
import type { RepositoryDashboardData } from '../types';

describe('RepositoriesCard', () => {
  const mockProjects: RepositoryDashboardData[] = [
    {
      owner: 'asabon',
      name: 'personal-dev-dashboard',
      fullName: 'asabon/personal-dev-dashboard',
      isPrivate: false,
      pullRequests: [
        {
          id: 'pr-1',
          number: 1,
          title: 'Add feature',
          url: 'https://github.com/asabon/personal-dev-dashboard/pull/1',
          updatedAt: '2026-09-23T00:00:00Z',
          author: { login: 'asabon', avatarUrl: '' },
          headBranch: 'feat',
          headSha: '123',
          shortSha: '123',
          overallCiState: 'SUCCESS',
          checks: [],
        },
      ],
    },
    {
      owner: 'octocat',
      name: 'frontend-app',
      fullName: 'octocat/frontend-app',
      isPrivate: true,
      pullRequests: [
        {
          id: 'pr-2',
          number: 2,
          title: 'Bugfix',
          url: 'https://github.com/octocat/frontend-app/pull/2',
          updatedAt: '2026-09-23T00:00:00Z',
          author: { login: 'octocat', avatarUrl: '' },
          headBranch: 'fix',
          headSha: '456',
          shortSha: '456',
          overallCiState: 'FAILURE',
          checks: [],
        },
      ],
    },
  ];

  it('一部の PR が失敗している場合は「1/2 Passed」サマリーバッジ（黄色）が表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard', 'octocat/frontend-app']}
        projects={mockProjects}
      />
    );

    expect(screen.getByText('監視リポジトリ')).toBeInTheDocument();
    expect(screen.getByText('2リポジトリ')).toBeInTheDocument();
    const badge = screen.getByText('1/2 Passed');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.inline-flex')).toHaveClass('text-amber-300');
  });

  it('全 PR が成功している場合は「1/1 Passed」（緑色）が表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard']}
        projects={[mockProjects[0]]}
      />
    );

    const badge = screen.getByText('1/1 Passed');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.inline-flex')).toHaveClass('text-emerald-400');
  });

  it('全 PR が失敗している場合は「0/1 Passed」（赤色）が表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['octocat/frontend-app']}
        projects={[mockProjects[1]]}
      />
    );

    const badge = screen.getByText('0/1 Passed');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.inline-flex')).toHaveClass('text-rose-300');
  });

  it('実行中の PR がある場合は「X Running」バッジが併記されること', () => {
    const runningProject: RepositoryDashboardData = {
      owner: 'octocat',
      name: 'api-gateway',
      fullName: 'octocat/api-gateway',
      isPrivate: false,
      pullRequests: [
        {
          id: 'pr-3',
          number: 3,
          title: 'WIP feature',
          url: 'https://github.com/octocat/api-gateway/pull/3',
          updatedAt: '2026-09-23T00:00:00Z',
          author: { login: 'asabon', avatarUrl: '' },
          headBranch: 'feat-wip',
          headSha: '789',
          shortSha: '789',
          overallCiState: 'PENDING',
          checks: [],
        },
      ],
    };

    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard', 'octocat/api-gateway']}
        projects={[mockProjects[0], runningProject]}
      />
    );

    expect(screen.getByText('1/2 Passed')).toBeInTheDocument();
    expect(screen.getByText('1 Running')).toBeInTheDocument();
  });

  it('PR が 0 件の場合は「0 PR」（緑色）が表示されること', () => {
    const emptyProject: RepositoryDashboardData = {
      owner: 'asabon',
      name: 'personal-dev-dashboard',
      fullName: 'asabon/personal-dev-dashboard',
      isPrivate: false,
      pullRequests: [],
    };

    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard']}
        projects={[emptyProject]}
      />
    );

    const badge = screen.getByText('0 PR');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.inline-flex')).toHaveClass('text-emerald-400');
  });

  it('リポジトリ取得エラーがある場合は「1 リポエラー」が表示されること', () => {
    const errorProject: RepositoryDashboardData = {
      owner: 'octocat',
      name: 'private-repo',
      fullName: 'octocat/private-repo',
      isPrivate: true,
      error: 'Not Found',
      pullRequests: [],
    };

    render(
      <RepositoriesCard
        repositories={['octocat/private-repo']}
        projects={[errorProject]}
      />
    );

    expect(screen.getByText('1 リポエラー')).toBeInTheDocument();
  });

  it('リポジトリが0件のときに「設定を開く」ボタンをクリックすると onOpenSettings が呼ばれること', () => {
    const handleOpenSettings = vi.fn();
    render(
      <RepositoriesCard
        repositories={[]}
        projects={[]}
        onOpenSettings={handleOpenSettings}
      />
    );

    const settingsBtn = screen.getByRole('button', { name: /設定を開く/ });
    fireEvent.click(settingsBtn);
    expect(handleOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('ヘッダークリックでカード全体を開閉できること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard']}
        projects={[mockProjects[0]]}
        isCompact={false}
      />
    );

    // 最初は開いている（asabon/personal-dev-dashboard が見える）
    expect(screen.getByText('asabon/personal-dev-dashboard')).toBeInTheDocument();

    // ヘッダーをクリックして折りたたむ
    const headerTitle = screen.getByText('監視リポジトリ');
    fireEvent.click(headerTitle);

    // 中身が閉じる
    expect(screen.queryByText('asabon/personal-dev-dashboard')).not.toBeInTheDocument();
  });
});
