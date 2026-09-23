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

  it('ヘッダーにリポジトリ数やサマリーバッジ（失敗数）が表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard', 'octocat/frontend-app']}
        projects={mockProjects}
        onAddRepo={vi.fn()}
        onRemoveRepo={vi.fn()}
      />
    );

    expect(screen.getByText('監視リポジトリ')).toBeInTheDocument();
    expect(screen.getByText('2リポジトリ')).toBeInTheDocument();
    expect(screen.getByText('1 PR failed')).toBeInTheDocument();
    expect(screen.getByText('1 PR passed')).toBeInTheDocument();
  });

  it('失敗がない場合は All passed バッジが表示されること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard']}
        projects={[mockProjects[0]]}
        onAddRepo={vi.fn()}
        onRemoveRepo={vi.fn()}
      />
    );

    expect(screen.getByText('1 PRs All passed')).toBeInTheDocument();
  });

  it('「追加」ボタンをクリックしたときに onAddRepo が呼ばれ、開閉がバブリングしないこと', () => {
    const handleAdd = vi.fn();
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard']}
        projects={[mockProjects[0]]}
        onAddRepo={handleAdd}
        onRemoveRepo={vi.fn()}
      />
    );

    const addBtn = screen.getByRole('button', { name: /追加/ });
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('ヘッダークリックでカード全体を開閉できること', () => {
    render(
      <RepositoriesCard
        repositories={['asabon/personal-dev-dashboard']}
        projects={[mockProjects[0]]}
        isCompact={false}
        onAddRepo={vi.fn()}
        onRemoveRepo={vi.fn()}
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
