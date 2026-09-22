import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActionsUsageCard } from './ActionsUsageCard';
import type { ActionsUsage } from '../types';

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
  };

  it('isLoading が true のときはスケルトンを表示すること', () => {
    const { container } = render(<ActionsUsageCard usage={null} isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('エラーがある場合はエラーメッセージを表示すること', () => {
    render(<ActionsUsageCard usage={null} error="API 取得エラー" />);
    expect(screen.getByText('Actions 使用量の取得に失敗しました')).toBeInTheDocument();
    expect(screen.getByText('API 取得エラー')).toBeInTheDocument();
  });

  it('usage が null の場合は何も表示しないこと', () => {
    const { container } = render(<ActionsUsageCard usage={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('正常な使用量データが正しく描画されること', () => {
    render(<ActionsUsageCard usage={mockUsage} />);

    // タイトル
    expect(screen.getByText('GitHub Actions 使用状況')).toBeInTheDocument();

    // 当月の使用量
    expect(screen.getByText(/当月の使用量/)).toBeInTheDocument();
    expect(screen.getByText('総稼働時間集計')).toBeInTheDocument();
    expect(screen.getAllByText('550')).toHaveLength(2); // メイン数値と OS 内訳 (Ubuntu)
    expect(screen.getByText('/ 2,000 分')).toBeInTheDocument();
    expect(screen.getByText('28%')).toBeInTheDocument();

    // 残り無料枠
    expect(screen.getByText(/残り無料枠/)).toBeInTheDocument();
    expect(screen.getByText('1,450')).toBeInTheDocument();
    expect(screen.getByText('(枠の 72%)')).toBeInTheDocument();

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
    expect(screen.getByText('残り僅か')).toBeInTheDocument();
  });

  it('単一アカウント指定時にアカウント名バッジが表示されること', () => {
    const usageWithAccount: ActionsUsage = {
      ...mockUsage,
      accountName: 'asabon',
      accountType: 'user',
    };
    render(<ActionsUsageCard usage={usageWithAccount} selectedAccount="asabon" />);
    expect(screen.getByText('asabon')).toBeInTheDocument();
  });

  it('複数アカウントがある場合に切り替えタブが表示され、クリックでコールバックが呼ばれること', () => {
    const accounts = [
      { name: 'asabon', type: 'user' as const },
      { name: 'asabon-lab', type: 'org' as const },
    ];
    let selected = 'asabon';
    const handleSelect = (name: string) => {
      selected = name;
    };

    const { rerender } = render(
      <ActionsUsageCard
        usage={{ ...mockUsage, accountName: 'asabon', accountType: 'user' }}
        accounts={accounts}
        selectedAccount="asabon"
        onSelectAccount={handleSelect}
      />
    );

    // 両方のアカウントタブが表示されている
    expect(screen.getByRole('button', { name: 'asabon (個人)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'asabon-lab (Org)' })).toBeInTheDocument();

    // asabon-lab をクリック
    screen.getByRole('button', { name: 'asabon-lab (Org)' }).click();
    expect(selected).toBe('asabon-lab');

    // Org 側の使用量データに切り替えて再描画
    const orgUsage: ActionsUsage = {
      totalMinutesUsed: 687,
      includedMinutes: 2000,
      usagePercentage: 34,
      breakdown: { ubuntu: 687, macOS: 0, windows: 0 },
      lastUpdated: '2026-09-22T00:00:00Z',
      accountName: 'asabon-lab',
      accountType: 'org',
    };
    rerender(
      <ActionsUsageCard
        usage={orgUsage}
        accounts={accounts}
        selectedAccount="asabon-lab"
        onSelectAccount={handleSelect}
      />
    );

    expect(screen.getAllByText('687')).toHaveLength(2);
    expect(screen.getByText('34%')).toBeInTheDocument();
  });

  it('複数アカウントがあり Org でエラーが発生してもタブが維持され、親切なエラーメッセージが表示されること', () => {
    const accounts = [
      { name: 'asabon', type: 'user' as const },
      { name: 'asabon-lab', type: 'org' as const },
    ];

    render(
      <ActionsUsageCard
        usage={null}
        error="Organization (asabon-lab) の Actions 使用量を取得できませんでした。"
        accounts={accounts}
        selectedAccount="asabon-lab"
      />
    );

    // タブが引き続き表示されている
    expect(screen.getByRole('button', { name: 'asabon (個人)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'asabon-lab (Org)' })).toBeInTheDocument();

    // エラーメッセージが表示されている
    expect(screen.getByText('「asabon-lab」の使用量を取得できませんでした')).toBeInTheDocument();
    expect(screen.getByText('Organization (asabon-lab) の Actions 使用量を取得できませんでした。')).toBeInTheDocument();
  });
});
