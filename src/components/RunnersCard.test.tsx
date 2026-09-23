import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RunnersCard } from './RunnersCard';
import type { SelfHostedRunner } from '../types';

describe('RunnersCard', () => {
  const dummyRunnerIdle: SelfHostedRunner = {
    id: 1,
    name: 'worker-node-1',
    os: 'Linux',
    status: 'online',
    busy: false,
    labels: ['self-hosted', 'Linux', 'X64'],
    scopeType: 'org',
    scopeName: 'test-org',
  };

  const dummyRunnerBusy: SelfHostedRunner = {
    id: 2,
    name: 'worker-node-2',
    os: 'Linux',
    status: 'online',
    busy: true,
    labels: ['self-hosted', 'Linux', 'X64'],
    scopeType: 'repo',
    scopeName: 'test-org/repo-a',
  };

  const dummyRunnerOffline: SelfHostedRunner = {
    id: 3,
    name: 'worker-node-3',
    os: 'macOS',
    status: 'offline',
    busy: false,
    labels: ['self-hosted', 'macOS', 'ARM64'],
    scopeType: 'org',
    scopeName: 'test-org',
  };

  it('1台登録で待機中の場合、"1 Idle" のみ表示され "Running" や "Offline" は表示されないこと', () => {
    render(
      <RunnersCard
        runners={[dummyRunnerIdle]}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('1 Idle')).toBeInTheDocument();
    expect(screen.queryByText(/Running/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
    expect(screen.getByText('1台')).toBeInTheDocument();
  });

  it('1台登録でジョブ実行中の場合、"1 Running" のみ表示され "Idle" や "Offline" は重複表示されないこと (#37)', () => {
    render(
      <RunnersCard
        runners={[dummyRunnerBusy]}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('1 Running')).toBeInTheDocument();
    expect(screen.queryByText(/Idle/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Online/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
    expect(screen.getByText('1台')).toBeInTheDocument();
  });

  it('2台登録（1台実行中、1台待機中）の場合、"1 Running" と "1 Idle" の両方が正確に表示されること', () => {
    render(
      <RunnersCard
        runners={[dummyRunnerIdle, dummyRunnerBusy]}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('1 Running')).toBeInTheDocument();
    expect(screen.getByText('1 Idle')).toBeInTheDocument();
    expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
    expect(screen.getByText('2台')).toBeInTheDocument();
  });

  it('3台登録（実行中1台、待機中1台、オフライン1台）の場合、各ステータスが排他的に集計されること', () => {
    render(
      <RunnersCard
        runners={[dummyRunnerIdle, dummyRunnerBusy, dummyRunnerOffline]}
        isLoading={false}
        error={null}
      />
    );

    expect(screen.getByText('1 Running')).toBeInTheDocument();
    expect(screen.getByText('1 Idle')).toBeInTheDocument();
    expect(screen.getByText('1 Offline')).toBeInTheDocument();
    expect(screen.getByText('3台')).toBeInTheDocument();
  });

  it('アコーディオンの開閉ができること', () => {
    render(
      <RunnersCard
        runners={[dummyRunnerIdle]}
        isLoading={false}
        error={null}
      />
    );

    // デフォルトでは開いているのでランナー名が表示されている
    expect(screen.getByText('worker-node-1')).toBeInTheDocument();

    // ヘッダーをクリックして閉じる
    fireEvent.click(screen.getByText('Self-hosted Runners'));
    expect(screen.queryByText('worker-node-1')).not.toBeInTheDocument();

    // 再度クリックして開く
    fireEvent.click(screen.getByText('Self-hosted Runners'));
    expect(screen.getByText('worker-node-1')).toBeInTheDocument();
  });

  it('ローディング表示が正しく行われること', () => {
    render(
      <RunnersCard
        runners={[]}
        isLoading={true}
        error={null}
      />
    );

    expect(screen.getByText('セルフホステッドランナーの稼働状況を確認中...')).toBeInTheDocument();
  });

  it('エラーメッセージが表示されること', () => {
    render(
      <RunnersCard
        runners={[]}
        isLoading={false}
        error="ランナー取得エラー"
      />
    );

    expect(screen.getByText('ランナー取得エラー')).toBeInTheDocument();
  });
});
