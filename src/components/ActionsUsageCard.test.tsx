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

  it('エラーがある場合はエラーメッセージを表示すること', () => {
    render(<ActionsUsageCard usage={null} error="API 取得エラー" />);
    expect(screen.getByText('使用量を取得できませんでした')).toBeInTheDocument();
    expect(screen.getByText('API 取得エラー')).toBeInTheDocument();
  });

  it('正常な使用量データが正しく描画されること（残量ファースト）', () => {
    render(<ActionsUsageCard usage={mockUsage} />);

    // タイトル
    expect(screen.getByText('GitHub Actions 使用状況')).toBeInTheDocument();

    // 残り無料枠（メイン表示）
    expect(screen.getByText(/残り無料枠/)).toBeInTheDocument();
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('(枠の 72%)')).toBeInTheDocument();

    // 当月の使用量（サブ表示）
    expect(screen.getByText(/当月使用量/)).toBeInTheDocument();
    expect(screen.getAllByText('550')).toHaveLength(2); // メイン数値と OS 内訳 (Ubuntu)
    expect(screen.getByText('/ 2,000 分')).toBeInTheDocument();
    expect(screen.getByText('28% 消費')).toBeInTheDocument();

    // OS 内訳
    expect(screen.getByText('Ubuntu (x1)')).toBeInTheDocument();
    expect(screen.getByText('macOS (x10)')).toBeInTheDocument();
    expect(screen.getByText('Windows (x2)')).toBeInTheDocument();
  });

  it('残り枠が200分未満の場合に警告色（text-rose-400）が適用されること', () => {
    const criticalUsage: ActionsUsage = {
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
    const remainingNumber = screen.getByText('100');
    expect(remainingNumber).toHaveClass('text-rose-400');
    expect(screen.getAllByText('残り僅か').length).toBeGreaterThanOrEqual(1);
  });

  it('複数アカウント（個人＋Org）がある場合に両方のカードが同時に並列レンダリングされること（タブクリック不要）', () => {
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

    // 両方のアカウント名が同時に表示されていること
    expect(screen.getAllByText('asabon').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('asabon-lab').length).toBeGreaterThanOrEqual(1);

    // 両方のアカウント種別バッジが表示されていること
    expect(screen.getByText('個人')).toBeInTheDocument();
    expect(screen.getByText('Org')).toBeInTheDocument();

    // 個人側の残量とOrg側の残量が両方表示されていること
    expect(screen.getByText('1,450')).toBeInTheDocument(); // 2000 - 550
    expect(screen.getByText('2,313')).toBeInTheDocument(); // 3000 - 687
  });

  it('複数アカウントのうち一方でエラーが発生しても、もう一方のアカウントは正常に表示されエラー側にはメッセージが出ること', () => {
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

    // 正常な側
    expect(screen.getAllByText('asabon').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1,450')).toBeInTheDocument();

    // エラー側
    expect(screen.getAllByText('asabon-lab').length).toBeGreaterThanOrEqual(1);
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

    // デフォルト展開状態: OS別内訳ボタンや当月使用量が表示されている
    expect(screen.getByText('OS別 実稼働内訳')).toBeInTheDocument();
    expect(screen.getByText(/残り無料枠/)).toBeInTheDocument();

    // アカウントカードのヘッダーをクリックして折りたたむ
    // （ヘッダー内にある「個人」ラベルをクリック）
    fireEvent.click(screen.getByText('個人'));

    // 折りたたみ状態: 詳細エリア（残り無料枠のラベルやOS内訳）が非表示になる
    expect(screen.queryByText('OS別 実稼働内訳')).not.toBeInTheDocument();
    expect(screen.queryByText(/残り無料枠/)).not.toBeInTheDocument();

    // 折りたたまれていても、ヘッダーの残枠サマリーは表示されていること
    expect(screen.getByText('残1,450分 (72%)')).toBeInTheDocument();

    // 再度クリックして展開
    fireEvent.click(screen.getByText('個人'));
    expect(screen.getByText('OS別 実稼働内訳')).toBeInTheDocument();
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

    // 初期状態: 両方展開されているので「1,450」と「2,313」が本文にも存在
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('2,313')).toBeInTheDocument();

    // Org 側だけ折りたたむ
    fireEvent.click(screen.getByText('Org'));

    // 個人側は展開されたまま（「1,450」は残る）
    expect(screen.getByText('1,450')).toBeInTheDocument();
    // Org 側の本文「2,313」は非表示になり、サマリーバッジ（残2,313分 (77%)）として存在
    expect(screen.queryByText('2,313')).not.toBeInTheDocument();
    expect(screen.getByText('残2,313分 (77%)')).toBeInTheDocument();
  });

  it('isCompact 時、余裕のあるアカウントはデフォルト折りたたみ、警告/エラーのあるアカウントは展開されること', () => {
    const accounts: ActionsUsageAccount[] = [
      { name: 'safe-user', type: 'user' },
      { name: 'critical-org', type: 'org' },
    ];

    const safeUsage: ActionsUsage = {
      totalMinutesUsed: 200,
      includedMinutes: 2000,
      usagePercentage: 10,
      breakdown: { ubuntu: 200, macOS: 0, windows: 0 },
      lastUpdated: '2026-09-22T00:00:00Z',
    };

    const criticalUsage: ActionsUsage = {
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

    render(
      <ActionsUsageCard
        accounts={accounts}
        usageMap={usageMap}
        isCompact={true}
      />
    );

    // safe-user は折りたたまれているため本文の「1,800」は出ず、ヘッダーサマリー「残1,800分 (90%)」が出る
    expect(screen.queryByText('1,800')).not.toBeInTheDocument();
    expect(screen.getByText('残1,800分 (90%)')).toBeInTheDocument();

    // critical-org は警告があるためデフォルト展開され、本文の「100」が出る
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});

