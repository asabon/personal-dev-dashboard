import { describe, it, expect } from 'vitest';
import { getDaysInMonth, calculateActionsPacing } from './actionsUsage';

describe('actionsUsage utility', () => {
  describe('getDaysInMonth', () => {
    it('月末が30日の月を正しく計算できること (4, 6, 9, 11月)', () => {
      // 0-indexed: 3=4月, 5=6月, 8=9月, 10=11月
      expect(getDaysInMonth(2026, 3)).toBe(30);
      expect(getDaysInMonth(2026, 5)).toBe(30);
      expect(getDaysInMonth(2026, 8)).toBe(30);
      expect(getDaysInMonth(2026, 10)).toBe(30);
    });

    it('月末が31日の月を正しく計算できること (1, 3, 5, 7, 8, 10, 12月)', () => {
      expect(getDaysInMonth(2026, 0)).toBe(31); // 1月
      expect(getDaysInMonth(2026, 2)).toBe(31); // 3月
      expect(getDaysInMonth(2026, 6)).toBe(31); // 7月
      expect(getDaysInMonth(2026, 7)).toBe(31); // 8月
      expect(getDaysInMonth(2026, 9)).toBe(31); // 10月
      expect(getDaysInMonth(2026, 11)).toBe(31); // 12月
    });

    it('2月の日数をうるう年と平年で正しく計算できること', () => {
      // 2024年はうるう年 (29日)
      expect(getDaysInMonth(2024, 1)).toBe(29);
      // 2025年は平年 (28日)
      expect(getDaysInMonth(2025, 1)).toBe(28);
    });
  });

  describe('calculateActionsPacing', () => {
    it('全体の90%以上使用している場合は「残り僅か」と判定されること', () => {
      // 9月10日 (30日中10日目: 目安33%)、使用率92%
      const testDate = new Date(2026, 8, 10);
      const result = calculateActionsPacing(1840, 2000, 92, testDate);

      expect(result.paceStatusText).toBe('残り僅か');
      expect(result.remainingMinutes).toBe(160);
      expect(result.barGradient).toContain('from-rose-500');
    });

    it('目安を15%以上超過し100分以上使用している場合は「ハイペース」と判定されること', () => {
      // 9月10日 (目安33%)、使用率55%（差分+22%）
      const testDate = new Date(2026, 8, 10);
      const result = calculateActionsPacing(1100, 2000, 55, testDate);

      expect(result.paceStatusText).toBe('ハイペース');
      expect(result.barGradient).toContain('from-rose-500');
    });

    it('目安を5%超過し100分以上使用している場合は「やや速い」と判定されること', () => {
      // 9月10日 (目安33%)、使用率40%（差分+7%）
      const testDate = new Date(2026, 8, 10);
      const result = calculateActionsPacing(800, 2000, 40, testDate);

      expect(result.paceStatusText).toBe('やや速い');
      expect(result.barGradient).toContain('from-amber-500');
    });

    it('目安以下の場合は「順調 (目安内)」と判定されること', () => {
      // 9月10日 (目安33%)、使用率20%
      const testDate = new Date(2026, 8, 10);
      const result = calculateActionsPacing(400, 2000, 20, testDate);

      expect(result.paceStatusText).toBe('順調 (目安内)');
      expect(result.barGradient).toContain('from-emerald-500');
    });

    it('使用量が枠を超過しても残り分数がマイナスにならないこと', () => {
      const testDate = new Date(2026, 8, 15);
      const result = calculateActionsPacing(2500, 2000, 125, testDate);

      expect(result.remainingMinutes).toBe(0);
      expect(result.paceStatusText).toBe('残り僅か');
    });
  });
});
