export interface ActionsPacing {
  daysInMonth: number;
  currentDay: number;
  expectedPercentage: number;
  expectedMinutes: number;
  remainingMinutes: number;
  paceStatusText: '残り僅か' | 'ハイペース' | 'やや速い' | '順調 (目安内)';
  barGradient: string;
  badgeColor: string;
}

/**
 * 指定した年月の日数を取得（month は 0-indexed: 0=1月, 1=2月, ...）
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Actions 使用量および当月の日付情報からペースと目安を計算する
 */
export function calculateActionsPacing(
  totalMinutesUsed: number,
  includedMinutes: number,
  usagePercentage: number,
  currentDate: Date = new Date()
): ActionsPacing {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const currentDay = currentDate.getDate();

  const expectedPercentage = Math.round((currentDay / daysInMonth) * 100);
  const expectedMinutes = Math.round((includedMinutes * currentDay) / daysInMonth);
  const remainingMinutes = Math.max(0, includedMinutes - totalMinutesUsed);

  // ペース判定に基づくカラー・テキスト設定
  // 1. 全体使用率が 90% 以上: 危険（赤）
  // 2. 目安比 +15% 超過 かつ 使用量 >= 100分: ハイペース（赤）
  // 3. 目安比 +5% 超過 かつ 使用量 >= 100分: やや速い（黄）
  // 4. それ以外: 順調（緑）
  let barGradient = 'from-emerald-500 to-teal-400';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let paceStatusText: ActionsPacing['paceStatusText'] = '順調 (目安内)';

  if (usagePercentage >= 90) {
    barGradient = 'from-rose-500 to-red-600';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    paceStatusText = '残り僅か';
  } else if (usagePercentage > expectedPercentage + 15 && totalMinutesUsed >= 100) {
    barGradient = 'from-rose-500 to-red-600';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    paceStatusText = 'ハイペース';
  } else if (usagePercentage > expectedPercentage + 5 && totalMinutesUsed >= 100) {
    barGradient = 'from-amber-500 to-yellow-400';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    paceStatusText = 'やや速い';
  }

  return {
    daysInMonth,
    currentDay,
    expectedPercentage,
    expectedMinutes,
    remainingMinutes,
    paceStatusText,
    barGradient,
    badgeColor,
  };
}
