import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsModal } from './SettingsModal';
import type { AppSettings } from '../types';
import * as githubApi from '../services/githubApi';

vi.mock('../services/githubApi', () => ({
  validateToken: vi.fn(),
  fetchUserRepositories: vi.fn(),
  fetchUserOrganizations: vi.fn(),
}));

describe('SettingsModal', () => {
  const baseSettings: AppSettings = {
    pat: 'ghp_test_token',
    username: 'asabon',
    repositories: ['octocat/frontend-app'],
    refreshIntervalSec: 60,
    features: {
      actionsUsage: { enabled: true, options: {} },
      selfHostedRunners: { enabled: false, options: {} },
      workflowRuns: { enabled: true, options: {} },
    },
    monitoredOrgs: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(githubApi.fetchUserRepositories).mockResolvedValue([
      {
        fullName: 'asabon/personal-dev-dashboard',
        name: 'personal-dev-dashboard',
        owner: 'asabon',
        isPrivate: false,
        description: 'My dashboard',
        updatedAt: '2026-11-07T00:00:00Z',
        stargazersCount: 5,
        fork: false,
      },
      {
        fullName: 'my-org/shared-lib',
        name: 'shared-lib',
        owner: 'my-org',
        isPrivate: true,
        description: 'Org shared library',
        updatedAt: '2026-11-07T00:00:00Z',
        stargazersCount: 2,
        fork: false,
      },
    ]);
    vi.mocked(githubApi.fetchUserOrganizations).mockResolvedValue([]);
  });

  it('自分のリポジトリが自動監視（登録不要）である旨の案内を表示し、候補一覧には外部リポジトリのみを表示すること', async () => {
    render(
      <SettingsModal
        isOpen={true}
        settings={baseSettings}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(
      screen.getByText(/自分のリポジトリ（@asabon 所有）はすべて自動監視されます（登録不要）/)
    ).toBeInTheDocument();

    // 外部リポジトリ候補として my-org/shared-lib が表示され、自分のリポジトリは候補に出ないこと
    await waitFor(() => {
      expect(screen.getByText('my-org/shared-lib')).toBeInTheDocument();
    });
    expect(screen.queryByText('asabon/personal-dev-dashboard')).not.toBeInTheDocument();
  });

  it('自分のリポジトリを手動追加しようとした場合は自動監視対象である旨を表示して重複追加を防ぐこと', async () => {
    render(
      <SettingsModal
        isOpen={true}
        settings={baseSettings}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('my-org/shared-lib')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/例: facebook\/react/);
    fireEvent.change(input, { target: { value: 'asabon/my-new-repo' } });
    fireEvent.submit(input.closest('form')!);

    expect(
      screen.getByText(
        /自分のリポジトリ \(asabon\/my-new-repo\) は自動的に監視対象に含まれるため、個別の登録は不要です。/
      )
    ).toBeInTheDocument();
  });

  it('外部リポジトリを追加して保存すると onSave に外部リポジトリ一覧が渡されること', async () => {
    const handleSave = vi.fn();
    render(
      <SettingsModal
        isOpen={true}
        settings={baseSettings}
        onClose={vi.fn()}
        onSave={handleSave}
        onLogout={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('my-org/shared-lib')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/例: facebook\/react/);
    fireEvent.change(input, { target: { value: 'vercel/next.js' } });
    fireEvent.submit(input.closest('form')!);

    expect(screen.getByText('vercel/next.js')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: '保存する' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          repositories: ['octocat/frontend-app', 'vercel/next.js'],
        })
      );
    });
  });
});

