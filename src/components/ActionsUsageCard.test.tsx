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

  it('エラーがある場合はエラーバッジを表示し、開くとエラー詳細メッセージを表示すること', () => {
    render(<ActionsUsageCard usage={null} error="API 取得エラー" />);
    // 親ヘッダーに取得エラーありバッジ
    expect(screen.getByText('取得エラーあり')).toBeInTheDocument();
    // アカウント行に取得エラー表示
    expect(screen.getByText('取得エラー')).toBeInTheDocument();

    // クリックして展開
    fireEvent.click(screen.getByText('取得エラー'));
    expect(screen.getByText('使用量を取得できませんでした')).toBeInTheDocument();
    expect(screen.getByText('API 取得エラー')).toBeInTheDocument();
  });

  it('初期表示は1行サマリーで表示され、アカウント行をクリックすると詳細（残量ファースト・OS内訳）が展開されること', () => {
    render(<ActionsUsageCard usage={mockUsage} />);

    // タイトルと全体サマリーバッジ
    expect(screen.getByText('GitHub Actions 使用状況')).toBeInTheDocument();
    expect(screen.getByText('全部目安以下')).toBeInTheDocument();

    // 初期状態は1行表示（折りたたみ）: ヘッダーに残量サマリーが表示されている
    expect(screen.getByText('残1,450分')).toBeInTheDocument();
    expect(screen.getByText('(72%)')).toBeInTheDocument();
    expect(screen.queryByText('OS別 実稼働内訳')).not.toBeInTheDocument();

    // アカウント行をクリックして詳細を展開
    fireEvent.click(screen.getByText('個人'));

    // 残り無料枠（メイン表示）
    expect(screen.getByText(/残り無料枠/)).toBeInTheDocument();
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('(枠の 72%)')).toBeInTheDocument();

    // 当月の使用量（サブ表示）
    expect(screen.getByText(/当月使用量/)).toBeInTheDocument();
    expect(screen.getByText('/ 2,000 分')).toBeInTheDocument();
    expect(screen.getByText('28% 消費')).toBeInTheDocument();

    // OS 内訳
    expect(screen.getByText('Ubuntu (x1)')).toBeInTheDocument();
    expect(screen.getByText('macOS (x10)')).toBeInTheDocument();
    expect(screen.getByText('Windows (x2)')).toBeInTheDocument();
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

    // アカウント行をクリックして展開
    fireEvent.click(screen.getByText('critical-user'));

    const remainingNumber = screen.getByText('100');
    expect(remainingNumber).toHaveClass('text-rose-400');
    expect(screen.getAllByText('残り僅か').length).toBeGreaterThanOrEqual(1);
  });

  it('複数アカウント（個人＋Org）がある場合に両方のアカウントが1行で整然とレンダリングされること', () => {
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

    // 1行ヘッダーの残量サマリーが両方表示されていること
    expect(screen.getByText('残1,450分')).toBeInTheDocument();
    expect(screen.getByText('残2,313分')).toBeInTheDocument();

    // 全体サマリーバッジ
    expect(screen.getByText('全部目安以下')).toBeInTheDocument();
  });

  it('複数アカウントのうち一方でエラーが発生しても、もう一方のアカウントは正常に表示され親ヘッダーに取得エラーありが出ること', () => {
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
    expect(screen.getByText('残1,450分')).toBeInTheDocument();

    // エラー側
    expect(screen.getByText('asabon-lab')).toBeInTheDocument();
    expect(screen.getByText('取得エラー')).toBeInTheDocument();

    // エラー側を展開してエラーメッセージ確認
    fireEvent.click(screen.getByText('取得エラー'));
    expect(screen.getByText('Organization の権限がありません')).toBeInTheDocument();
  });

  it('個別アカウントのヘッダークリックでカードの開閉（折りたたみ/展開）ができること', () => {
    const accounts: ActionsUsageAccount[] = [
      { name: 'asabon', type: 'user' },
    ];

    const usageMap: Record<string, ActionsUsageItem> = {
      asabon: { usage: mockUsage, error: null },
    };

    render(
      <ActionsUsageCard
        accounts={accounts}
        usageMap={usageMap}
      />
    );

    // 初期状態は折りたたみ（詳細非表示）
    expect(screen.queryByText('OS別 実稼働内訳')).not.toBeInTheDocument();
    expect(screen.queryByText(/残り無料枠/)).not.toBeInTheDocument();
    expect(screen.getByText('残1,450分')).toBeInTheDocument();

    // アカウントカードのヘッダーをクリックして展開
    fireEvent.click(screen.getByText('個人'));

    // 展開状態: OS別内訳ボタンや残り無料枠が表示される
    expect(screen.getByText('OS別 実稼働内訳')).toBeInTheDocument();
    expect(screen.getByText(/残り無料枠/)).toBeInTheDocument();

    // 再度クリックして折りたたむ
    fireEvent.click(screen.getByText('個人'));
    expect(screen.queryByText('OS別 実稼働内訳')).not.toBeInTheDocument();
    expect(screen.getByText('残1,450分')).toBeInTheDocument();
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

    // 初期状態: 両方折りたたまれている
    expect(screen.queryByText('1,450')).not.toBeInTheDocument();
    expect(screen.queryByText('2,313')).not.toBeInTheDocument();

    // 個人側だけ展開する
    fireEvent.click(screen.getByText('個人'));

    // 個人側は展開（「1,450」が存在）、Org 側は折りたたまれたまま（「2,313」は非表示）
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.queryByText('2,313')).not.toBeInTheDocument();
    expect(screen.getByText('残2,313分')).toBeInTheDocument();

    // Org 側も展開する
    fireEvent.click(screen.getByText('Org'));
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('2,313')).toBeInTheDocument();
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
