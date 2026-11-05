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

  it('一部の PR が失敗・一部が成功している場合は「1 Failed」と「1 Passed」が個別に表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard', 'octocat/frontend-app']}
        projects={mockProjects}
      />
    );

    expect(screen.getByText('Open PRs')).toBeInTheDocument();
    expect(screen.getByText('2件')).toBeInTheDocument();
    const failedBadges = screen.getAllByText('1 Failed');
    const passedBadges = screen.getAllByText('1 Passed');
    expect(failedBadges.length).toBeGreaterThanOrEqual(1);
    expect(passedBadges.length).toBeGreaterThanOrEqual(1);
    expect(failedBadges[0].closest('.inline-flex')).toHaveClass('text-rose-300');
    expect(passedBadges[0].closest('.inline-flex')).toHaveClass('text-emerald-400');
  });

  it('全 PR が成功している場合は「All Passed」（緑色）が表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard']}
        projects={[mockProjects[0]]}
      />
    );

    const badges = screen.getAllByText('All Passed');
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(badges[0].closest('.inline-flex')).toHaveClass('text-emerald-400');
  });

  it('全 PR が失敗している場合は「1 Failed」（赤色）が表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['octocat/frontend-app']}
        projects={[mockProjects[1]]}
      />
    );

    const badges = screen.getAllByText('1 Failed');
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(badges[0].closest('.inline-flex')).toHaveClass('text-rose-300');
  });

  it('実行中の PR と成功 PR がある場合は「1 Running」と「1 Passed」が併記されること', () => {
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

    const passedBadge = screen.getAllByText('1 Passed')[0];
    const runningBadge = screen.getAllByText('1 Running')[0];
    expect(passedBadge).toBeInTheDocument();
    expect(runningBadge).toBeInTheDocument();
    // Running が Passed より前に表示されること（進行中が左、状態が右）
    expect(runningBadge.compareDocumentPosition(passedBadge)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('PR が 0 件の場合は「0 PR」（緑色）が表示され、0件のリポジトリカードは非表示になること', () => {
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
    expect(screen.queryByText('asabon/personal-dev-dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('現在 Open な Pull Request はありません')).toBeInTheDocument();
  });

  it('Open PR があるリポジトリと 0 件のリポジトリが混在する場合、0 件のリポジトリのみ非表示になること', () => {
    const emptyProject: RepositoryDashboardData = {
      owner: 'octocat',
      name: 'api-gateway',
      fullName: 'octocat/api-gateway',
      isPrivate: true,
      pullRequests: [],
    };

    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard', 'octocat/api-gateway']}
        projects={[mockProjects[0], emptyProject]}
      />
    );

    expect(screen.getByText('asabon/personal-dev-dashboard')).toBeInTheDocument();
    expect(screen.queryByText('octocat/api-gateway')).not.toBeInTheDocument();
  });

  it('リポジトリ取得エラーがある場合は「1 リポエラー」が表示され、エラーのあるリポジトリカードは0件PRでも表示されること', () => {
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
    expect(screen.getByText('octocat/private-repo')).toBeInTheDocument();
    expect(screen.getByText('取得エラー')).toBeInTheDocument();
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });

  it('読込中（isLoading=true）の場合は「0 PR」ではなく確認中メッセージが表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard']}
        projects={[]}
        isLoading={true}
      />
    );

    expect(screen.queryByText('0 PR')).not.toBeInTheDocument();
    expect(screen.getByText('Pull Request と CI 状況を確認中...')).toBeInTheDocument();
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
    const headerTitle = screen.getByText('Open PRs');
    fireEvent.click(headerTitle);

    // 中身が閉じる
    expect(screen.queryByText('asabon/personal-dev-dashboard')).not.toBeInTheDocument();
  });

  it('簡易表示モード（isCompact=true）ではCI失敗があっても親カードは初期折りたたまれ、クリックで開けること', () => {
    render(
      <RepositoriesCard
        repositories={['octocat/frontend-app']}
        projects={[mockProjects[1]]}
        isCompact={true}
      />
    );

    // サマリーバッジには1 Failedが表示されるが、中身は折りたたまれている
    expect(screen.getByText('1 Failed')).toBeInTheDocument();
    expect(screen.queryByText('octocat/frontend-app')).not.toBeInTheDocument();

    // ヘッダークリックで展開される
    fireEvent.click(screen.getByText('Open PRs'));
    expect(screen.getByText('octocat/frontend-app')).toBeInTheDocument();
  });
});
