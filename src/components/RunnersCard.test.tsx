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

  describe('ヘッダーサマリーバッジ（分数表示とステータス）', () => {
    it('1台登録で待機中の場合、"1/1 Online"（緑色）のみ表示されること', () => {
      render(
        <RunnersCard
          runners={[dummyRunnerIdle]}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('1/1 Online')).toBeInTheDocument();
      expect(screen.queryByText(/Running/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
      expect(screen.getByText('1台')).toBeInTheDocument();
    });

    it('1台登録でジョブ実行中の場合、"1/1 Online"（緑色）と "1台 Running"（黄色）が表示されること', () => {
      render(
        <RunnersCard
          runners={[dummyRunnerBusy]}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('1/1 Online')).toBeInTheDocument();
      expect(screen.getByText('1台 Running')).toBeInTheDocument();
      expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
      expect(screen.getByText('1台')).toBeInTheDocument();
    });

    it('2台登録（1台実行中、1台待機中）の場合、"2/2 Online" と "1台 Running" が表示されること', () => {
      render(
        <RunnersCard
          runners={[dummyRunnerIdle, dummyRunnerBusy]}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('2/2 Online')).toBeInTheDocument();
      expect(screen.getByText('1台 Running')).toBeInTheDocument();
      expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
      expect(screen.getByText('2台')).toBeInTheDocument();
    });

    it('3台登録（実行中1台、待機中1台、オフライン1台）の場合、"1台 Offline"（赤）、"2/3 Online"、"1台 Running"（黄）が表示されること', () => {
      render(
        <RunnersCard
          runners={[dummyRunnerIdle, dummyRunnerBusy, dummyRunnerOffline]}
          isLoading={false}
          error={null}
        />
      );

      expect(screen.getByText('1台 Offline')).toBeInTheDocument();
      expect(screen.getByText('2/3 Online')).toBeInTheDocument();
      expect(screen.getByText('1台 Running')).toBeInTheDocument();
      expect(screen.getByText('3台')).toBeInTheDocument();
    });

    it('エラー発生時は親ヘッダーに "取得エラーあり" が表示されること', () => {
      render(
        <RunnersCard
          runners={[]}
          isLoading={false}
          error="API エラー"
        />
      );

      expect(screen.getByText('取得エラーあり')).toBeInTheDocument();
    });
  });

  describe('表示モード連動と開閉ポリシー', () => {
    it('詳細モード（isCompact=false）では常に展開され、OSやタグ一覧が最初から表示されること', () => {
      render(
        <RunnersCard
          runners={[dummyRunnerIdle]}
          isLoading={false}
          error={null}
          isCompact={false}
        />
      );

      // ランナー名、スコープ、OS、タグが表示されていること
      expect(screen.getByText('worker-node-1')).toBeInTheDocument();
      expect(screen.getByText(/Org: test-org/)).toBeInTheDocument();
      expect(screen.getByText('Linux')).toBeInTheDocument();
      expect(screen.getByText('X64')).toBeInTheDocument();

      // 各ランナー行をクリックして折りたためること
      fireEvent.click(screen.getByText('worker-node-1'));
      expect(screen.queryByText('X64')).not.toBeInTheDocument();

      // 再度クリックして展開できること
      fireEvent.click(screen.getByText('worker-node-1'));
      expect(screen.getByText('X64')).toBeInTheDocument();
    });

    it('簡易モード（isCompact=true）で全台Onlineの正常時は親カードが初期折りたたみとなり、親展開で1行表示、個別クリックで詳細が開くこと', () => {
      render(
        <RunnersCard
          runners={[dummyRunnerIdle]}
          isLoading={false}
          error={null}
          isCompact={true}
        />
      );

      // サマリーバッジは見えるが、中身は折りたたまれている
      expect(screen.getByText('1/1 Online')).toBeInTheDocument();
      expect(screen.queryByText('worker-node-1')).not.toBeInTheDocument();

      // 1. ヘッダーをクリックして親カードを開くと、1行表示でランナーが表示されること
      fireEvent.click(screen.getByText('Self-hosted Runners'));
      expect(screen.getByText('worker-node-1')).toBeInTheDocument();
      expect(screen.getByText(/Org: test-org/)).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      // 簡易モードの1行初期状態ではタグは非表示
      expect(screen.queryByText('X64')).not.toBeInTheDocument();

      // 2. 個別ランナー行をクリックすると、詳細（OSやタグ）が展開されること
      fireEvent.click(screen.getByText('worker-node-1'));
      expect(screen.getByText('Linux')).toBeInTheDocument();
      expect(screen.getByText('X64')).toBeInTheDocument();
    });

    it('簡易モード（isCompact=true）でもオフラインがある場合は自動で親カードが展開されること', () => {
      render(
        <RunnersCard
          runners={[dummyRunnerOffline]}
          isLoading={false}
          error={null}
          isCompact={true}
        />
      );

      // オフラインがあるため初期状態から展開されている
      expect(screen.getByText('worker-node-3')).toBeInTheDocument();
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('簡易モード（isCompact=true）でもエラーがある場合は自動で親カードが展開されること', () => {
      render(
        <RunnersCard
          runners={[]}
          isLoading={false}
          error="Runner API error"
          isCompact={true}
        />
      );

      // エラーメッセージが表示されていること
      expect(screen.getByText('Runner API error')).toBeInTheDocument();
    });

    it('ヘッダークリックでアコーディオンの開閉ができること', () => {
      render(
        <RunnersCard
          runners={[dummyRunnerIdle]}
          isLoading={false}
          error={null}
          isCompact={false}
        />
      );

      expect(screen.getByText('worker-node-1')).toBeInTheDocument();

      // ヘッダーをクリックして閉じる
      fireEvent.click(screen.getByText('Self-hosted Runners'));
      expect(screen.queryByText('worker-node-1')).not.toBeInTheDocument();

      // 再度クリックして開く
      fireEvent.click(screen.getByText('Self-hosted Runners'));
      expect(screen.getByText('worker-node-1')).toBeInTheDocument();
    });
  });
});
