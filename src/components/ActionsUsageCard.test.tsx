import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionsUsageCard } from './ActionsUsageCard';
import type { ActionsUsage, ActionsUsageAccount, ActionsUsageItem } from '../types';

describe('ActionsUsageCard', () => {
  const mockUsage: ActionsUsage = {
    totalMinutesUsed: 550,
    includedMinutes: 2000,
    usagePercentage: 28,
    breakdown: {
      ubuntu: 550,
      macOS: 0,
      windows: 0,
    },
    lastUpdated: '2026-09-22T00:00:00Z',
    accountName: 'asabon',
    accountType: 'user',
  };

  it('isLoading が true のときはスケルトンを表示すること', () => {
    const { container } = render(<ActionsUsageCard usage={null} isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('エラーがある場合は親ヘッダーにバッジが表示され、詳細モードでは最初からエラーメッセージが表示されること', () => {
    render(<ActionsUsageCard usage={null} error="API 取得エラー" />);
    // 親ヘッダーに取得エラーありバッジ
    expect(screen.getByText('取得エラーあり')).toBeInTheDocument();
    // アカウント行に取得エラー表示
    expect(screen.getByText('取得エラー')).toBeInTheDocument();

    // 詳細モード (isCompact=false) では最初からエラー詳細が表示されている
    expect(screen.getByText('使用量を取得できませんでした')).toBeInTheDocument();
    expect(screen.getByText('API 取得エラー')).toBeInTheDocument();

    // ヘッダークリックで折りたためること
    fireEvent.click(screen.getByText('取得エラー'));
    expect(screen.queryByText('使用量を取得できませんでした')).not.toBeInTheDocument();
  });

  it('詳細表示モード（デフォルト）ではアカウントの詳細が最初から展開されること', () => {
    render(<ActionsUsageCard usage={mockUsage} />);

    // タイトルと全体サマリーバッジ
    expect(screen.getByText('GitHub Actions 使用状況')).toBeInTheDocument();
    expect(screen.getByText('全部目安以下')).toBeInTheDocument();

    // 詳細モードでは最初から詳細が展開されている
    expect(screen.getByText(/残り無料枠/)).toBeInTheDocument();
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('(枠の 72%)')).toBeInTheDocument();
    expect(screen.getByText(/当月使用量/)).toBeInTheDocument();
    expect(screen.getByText('/ 2,000 分')).toBeInTheDocument();
    expect(screen.getByText('28% 消費')).toBeInTheDocument();
    expect(screen.getByText('Ubuntu (x1)')).toBeInTheDocument();

    // アカウント行をクリックすると折りたたまれること
    fireEvent.click(screen.getByText('個人'));
    expect(screen.queryByText('OS別 実稼働内訳')).not.toBeInTheDocument();
    expect(screen.getByText('残1,450分')).toBeInTheDocument();

    // 再度クリックで展開
    fireEvent.click(screen.getByText('個人'));
    expect(screen.getByText('OS別 実稼働内訳')).toBeInTheDocument();
  });

  it('簡易表示モード（isCompact=true）では正常時親カードが初期折りたたみとなり、親展開で1行表示、個別展開で詳細が表示されること', () => {
    render(<ActionsUsageCard usage={mockUsage} isCompact={true} />);

    // タイトルと全体サマリーバッジ
    expect(screen.getByText('GitHub Actions 使用状況')).toBeInTheDocument();
    expect(screen.getByText('全部目安以下')).toBeInTheDocument();

    // 簡易モードでは正常時、親カードは初期折りたたまれている（子カードはまだ見えない）
    expect(screen.queryByText('OS別 実稼働内訳')).not.toBeInTheDocument();
    expect(screen.queryByText(/残り無料枠/)).not.toBeInTheDocument();

    // 1. 最上位（親カード）をクリックして開く
    fireEvent.click(screen.getByText('GitHub Actions 使用状況'));

    // 親展開直後は各アカウントは1行表示（残量バッジが表示され、詳細は折りたたみ）
    expect(screen.getByText('残1,450分')).toBeInTheDocument();
    expect(screen.getByText('(72%)')).toBeInTheDocument();
    expect(screen.queryByText('OS別 実稼働内訳')).not.toBeInTheDocument();
    expect(screen.queryByText(/残り無料枠/)).not.toBeInTheDocument();

    // 2. 個別アカウント行をクリックして詳細を展開
    fireEvent.click(screen.getByText('個人'));
    expect(screen.getByText(/残り無料枠/)).toBeInTheDocument();
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('OS別 実稼働内訳')).toBeInTheDocument();
  });

  it('残り枠が200分未満の場合に目安越えバッジおよび警告色（text-rose-400）が適用されること', () => {
    const criticalUsage: ActionsUsage = {
      accountName: 'critical-user',
      accountType: 'user',
      totalMinutesUsed: 1900,
      includedMinutes: 2000,
      usagePercentage: 95,
      breakdown: {
        ubuntu: 1900,
        macOS: 0,
        windows: 0,
      },
      lastUpdated: '2026-09-22T00:00:00Z',
    };

    render(<ActionsUsageCard usage={criticalUsage} />);
    // 親ヘッダーのサマリーバッジ
    expect(screen.getByText('目安越えあり')).toBeInTheDocument();

    const remainingNumber = screen.getByText('100');
    expect(remainingNumber).toHaveClass('text-rose-400');
    expect(screen.getAllByText('残り僅か').length).toBeGreaterThanOrEqual(1);
  });

  it('複数アカウント（個人＋Org）がある場合に両方のアカウントが並列レンダリングされること', () => {
    const accounts: ActionsUsageAccount[] = [
      { name: 'asabon', type: 'user' },
      { name: 'asabon-lab', type: 'org' },
    ];

    const orgUsage: ActionsUsage = {
      totalMinutesUsed: 687,
      includedMinutes: 3000,
      usagePercentage: 23,
      breakdown: { ubuntu: 687, macOS: 0, windows: 0 },
      lastUpdated: '2026-09-22T00:00:00Z',
      accountName: 'asabon-lab',
      accountType: 'org',
    };

    const usageMap: Record<string, ActionsUsageItem> = {
      asabon: { usage: mockUsage, error: null },
      'asabon-lab': { usage: orgUsage, error: null },
    };

    render(
      <ActionsUsageCard
        accounts={accounts}
        usageMap={usageMap}
      />
    );

    // 両方のアカウント名が表示されていること
    expect(screen.getByText('asabon')).toBeInTheDocument();
    expect(screen.getByText('asabon-lab')).toBeInTheDocument();

    // 両方のアカウント種別バッジが表示されていること
    expect(screen.getByText('個人')).toBeInTheDocument();
    expect(screen.getByText('Org')).toBeInTheDocument();

    // 詳細モードなので両方の数値が展開されていること
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('2,313')).toBeInTheDocument();

    // 全体サマリーバッジ
    expect(screen.getByText('全部目安以下')).toBeInTheDocument();
  });

  it('複数アカウントのうち一方でエラーが発生しても、もう一方のアカウントは正常に表示されエラーメッセージが展開されること', () => {
    const accounts: ActionsUsageAccount[] = [
      { name: 'asabon', type: 'user' },
      { name: 'asabon-lab', type: 'org' },
    ];

    const usageMap: Record<string, ActionsUsageItem> = {
      asabon: { usage: mockUsage, error: null },
      'asabon-lab': { usage: null, error: 'Organization の権限がありません' },
    };

    render(
      <ActionsUsageCard
        accounts={accounts}
        usageMap={usageMap}
      />
    );

    // 親ヘッダーに取得エラーあり
    expect(screen.getByText('取得エラーあり')).toBeInTheDocument();

    // 正常な側
    expect(screen.getByText('asabon')).toBeInTheDocument();
    expect(screen.getByText('1,450')).toBeInTheDocument();

    // エラー側
    expect(screen.getByText('asabon-lab')).toBeInTheDocument();
    expect(screen.getByText('取得エラー')).toBeInTheDocument();
    expect(screen.getByText('Organization の権限がありません')).toBeInTheDocument();
  });

  it('複数アカウント時、一方のアカウントだけを独立して開閉できること', () => {
    const accounts: ActionsUsageAccount[] = [
      { name: 'asabon', type: 'user' },
      { name: 'asabon-lab', type: 'org' },
    ];

    const orgUsage: ActionsUsage = {
      totalMinutesUsed: 687,
      includedMinutes: 3000,
      usagePercentage: 23,
      breakdown: { ubuntu: 687, macOS: 0, windows: 0 },
      lastUpdated: '2026-09-22T00:00:00Z',
      accountName: 'asabon-lab',
      accountType: 'org',
    };

    const usageMap: Record<string, ActionsUsageItem> = {
      asabon: { usage: mockUsage, error: null },
      'asabon-lab': { usage: orgUsage, error: null },
    };

    render(
      <ActionsUsageCard
        accounts={accounts}
        usageMap={usageMap}
      />
    );

    // 詳細モード初期状態: 両方展開されている
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('2,313')).toBeInTheDocument();

    // Org 側だけ折りたたむ
    fireEvent.click(screen.getByText('Org'));

    // 個人側は展開のまま（「1,450」が存在）、Org 側は折りたたまれる（「2,313」は非表示）
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.queryByText('2,313')).not.toBeInTheDocument();
    expect(screen.getByText('残2,313分')).toBeInTheDocument();

    // Org 側を再度クリックして展開する
    fireEvent.click(screen.getByText('Org'));
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('2,313')).toBeInTheDocument();
  });

  it('表示モード（isCompact: true <--> false）の切り替えで開閉状態が連動すること', () => {
    const accounts: ActionsUsageAccount[] = [
      { name: 'safe-user', type: 'user' },
      { name: 'critical-org', type: 'org' },
    ];

    const safeUsage: ActionsUsage = {
      accountName: 'safe-user',
      accountType: 'user',
      totalMinutesUsed: 200,
      includedMinutes: 2000,
      usagePercentage: 10,
      breakdown: { ubuntu: 200, macOS: 0, windows: 0 },
      lastUpdated: '2026-09-22T00:00:00Z',
    };

    const criticalUsage: ActionsUsage = {
      accountName: 'critical-org',
      accountType: 'org',
      totalMinutesUsed: 1900,
      includedMinutes: 2000,
      usagePercentage: 95,
      breakdown: { ubuntu: 1900, macOS: 0, windows: 0 },
      lastUpdated: '2026-09-22T00:00:00Z',
    };

    const usageMap: Record<string, ActionsUsageItem> = {
      'safe-user': { usage: safeUsage, error: null },
      'critical-org': { usage: criticalUsage, error: null },
    };

    // 1. 簡易表示モードでレンダー
    const { rerender } = render(
      <ActionsUsageCard
        accounts={accounts}
        usageMap={usageMap}
        isCompact={true}
      />
    );

    // 簡易モードでは、安全な safe-user は折りたたまれ（1,800は非表示）、警告のある critical-org は展開（100が表示）
    expect(screen.queryByText('1,800')).not.toBeInTheDocument();
    expect(screen.getByText('残1,800分')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();

    // 2. 詳細表示モードへ切り替え
    rerender(
      <ActionsUsageCard
        accounts={accounts}
        usageMap={usageMap}
        isCompact={false}
      />
    );

    // 詳細モードでは両方のアカウント詳細が全開になる
    expect(screen.getByText('1,800')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  describe('サマリーバッジの判定ロジック', () => {
    it('全アカウントが目安内の場合は「全部目安以下」（緑色）を表示すること', () => {
      const accounts: ActionsUsageAccount[] = [
        { name: 'asabon', type: 'user' },
      ];
      const usageMap: Record<string, ActionsUsageItem> = {
        asabon: { usage: mockUsage, error: null },
      };

      render(<ActionsUsageCard accounts={accounts} usageMap={usageMap} />);
      const badge = screen.getByText('全部目安以下');
      expect(badge).toBeInTheDocument();
      expect(badge.closest('.inline-flex')).toHaveClass('text-emerald-400');
    });

    it('ペースがやや速いアカウントがある場合は「目安間近あり」（黄色）を表示すること', () => {
      const accounts: ActionsUsageAccount[] = [
        { name: 'asabon', type: 'user' },
      ];
      // 86% 使用率（目安間近判定）
      const nearUsage: ActionsUsage = {
        accountName: 'asabon',
        accountType: 'user',
        totalMinutesUsed: 1720,
        includedMinutes: 2000,
        usagePercentage: 86,
        breakdown: { ubuntu: 1720, macOS: 0, windows: 0 },
        lastUpdated: '2026-09-22T00:00:00Z',
      };
      const usageMap: Record<string, ActionsUsageItem> = {
        asabon: { usage: nearUsage, error: null },
      };

      render(<ActionsUsageCard accounts={accounts} usageMap={usageMap} />);
      const badge = screen.getByText('目安間近あり');
      expect(badge).toBeInTheDocument();
      expect(badge.closest('.inline-flex')).toHaveClass('text-amber-300');
    });

    it('目安を大きく超過しているアカウントがある場合は「目安越えあり」（赤色）を表示すること', () => {
      const accounts: ActionsUsageAccount[] = [
        { name: 'safe-user', type: 'user' },
        { name: 'over-user', type: 'user' },
      ];
      const overUsage: ActionsUsage = {
        accountName: 'over-user',
        accountType: 'user',
        totalMinutesUsed: 1950,
        includedMinutes: 2000,
        usagePercentage: 98,
        breakdown: { ubuntu: 1950, macOS: 0, windows: 0 },
        lastUpdated: '2026-09-22T00:00:00Z',
      };
      const usageMap: Record<string, ActionsUsageItem> = {
        'safe-user': { usage: mockUsage, error: null },
        'over-user': { usage: overUsage, error: null },
      };

      render(<ActionsUsageCard accounts={accounts} usageMap={usageMap} />);
      const badge = screen.getByText('目安越えあり');
      expect(badge).toBeInTheDocument();
      expect(badge.closest('.inline-flex')).toHaveClass('text-rose-300');
    });

    it('親カードの折りたたみ・展開に関わらずサマリーバッジが親ヘッダーに表示され続けること', () => {
      const accounts: ActionsUsageAccount[] = [
        { name: 'asabon', type: 'user' },
      ];
      const usageMap: Record<string, ActionsUsageItem> = {
        asabon: { usage: mockUsage, error: null },
      };

      render(<ActionsUsageCard accounts={accounts} usageMap={usageMap} />);

      // 展開状態（デフォルト）
      expect(screen.getByText('全部目安以下')).toBeInTheDocument();
      expect(screen.getByText('asabon')).toBeInTheDocument();

      // 親ヘッダーをクリックして折りたたむ
      fireEvent.click(screen.getByText('GitHub Actions 使用状況'));

      // 折りたたみ状態でもサマリーバッジは表示され、子カード一覧は非表示
      expect(screen.getByText('全部目安以下')).toBeInTheDocument();
      expect(screen.queryByText('asabon')).not.toBeInTheDocument();
    });
  });
});
