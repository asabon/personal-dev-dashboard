import React from 'react';
import { Cpu, AlertTriangle, AlertCircle, CheckCircle2, Monitor, Apple, Terminal } from 'lucide-react';
import type { ActionsUsage } from '../types';

interface ActionsUsageCardProps {
  usage: ActionsUsage | null;
  error?: string | null;
  isLoading?: boolean;
}

export const ActionsUsageCard: React.FC<ActionsUsageCardProps> = ({ usage, error, isLoading }) => {
  if (isLoading && !usage) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 animate-pulse">
        <div className="h-6 w-48 bg-slate-800 rounded mb-4" />
        <div className="h-4 w-full bg-slate-800 rounded mb-3" />
        <div className="h-8 w-64 bg-slate-800 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5 text-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-300">Actions 使用量の取得に失敗しました</p>
          <p className="text-xs text-amber-400/80 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const { totalMinutesUsed, includedMinutes, usagePercentage, breakdown } = usage;
  const remainingMinutes = Math.max(0, includedMinutes - totalMinutesUsed);

  // 当月の日付と経過目安の計算
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  const expectedPercentage = Math.round((currentDay / daysInMonth) * 100);
  const expectedMinutes = Math.round((includedMinutes * currentDay) / daysInMonth);

  // ペース判定に基づくカラー・テキスト設定
  // 1. 全体使用率が 90% 以上: 危険（赤）
  // 2. 目安比 +15% 超過 かつ 使用量 >= 100分: ハイペース（赤）
  // 3. 目安比 +5% 超過 かつ 使用量 >= 100分: やや速い（黄）
  // 4. それ以外: 順調（緑）
  let barGradient = 'from-emerald-500 to-teal-400';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let paceStatusText = '順調';
  let PaceIcon = CheckCircle2;

  if (usagePercentage >= 90) {
    barGradient = 'from-rose-500 to-red-600';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    paceStatusText = '残り僅か';
    PaceIcon = AlertTriangle;
  } else if (usagePercentage > expectedPercentage + 15 && totalMinutesUsed >= 100) {
    barGradient = 'from-rose-500 to-red-600';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    paceStatusText = 'ハイペース';
    PaceIcon = AlertTriangle;
  } else if (usagePercentage > expectedPercentage + 5 && totalMinutesUsed >= 100) {
    barGradient = 'from-amber-500 to-yellow-400';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    paceStatusText = 'やや速い';
    PaceIcon = AlertCircle;
  }

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 shadow-xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              GitHub Actions 無料枠使用量 (今月)
            </h2>
            <p className="text-xs text-slate-400">
              月間無料枠: {includedMinutes.toLocaleString()} 分 / 残り{' '}
              <span className="text-slate-200 font-semibold">{remainingMinutes.toLocaleString()} 分</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColor} flex items-center gap-1.5`}>
            <PaceIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{usagePercentage}% 使用中</span>
            <span className="opacity-40">•</span>
            <span className="text-[11px] font-medium">{paceStatusText}</span>
          </span>
        </div>
      </div>

      {/* Progress Bar with Pacing Line Overlay */}
      <div className="space-y-1.5 mb-5">
        <div className="relative">
          {/* Progress Bar Track */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(100, Math.max(2, usagePercentage))}%` }}
            />
            {/* Target Pace Marker Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-sky-300 shadow-[0_0_6px_rgba(56,189,248,0.9)] pointer-events-none z-10"
              style={{ left: `${Math.min(99.5, Math.max(0.5, expectedPercentage))}%` }}
              title={`本日の目安: ${expectedPercentage}% (${expectedMinutes.toLocaleString()} 分)`}
            />
          </div>
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span>{totalMinutesUsed.toLocaleString()} min used</span>
            <span className="text-slate-500 font-sans text-[10px]">
              (本日目安: {expectedMinutes.toLocaleString()} min / {expectedPercentage}%)
            </span>
          </div>
          <span>{includedMinutes.toLocaleString()} min</span>
        </div>
      </div>

      {/* OS Breakdown */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <Terminal className="w-4 h-4 text-orange-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ubuntu (x1)</div>
            <div className="text-sm font-semibold font-mono text-slate-200">{breakdown.ubuntu.toLocaleString()} <span className="text-xs text-slate-400 font-normal">分</span></div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <Apple className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">macOS (x10)</div>
            <div className="text-sm font-semibold font-mono text-slate-200">{breakdown.macOS.toLocaleString()} <span className="text-xs text-slate-400 font-normal">分</span></div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Windows (x2)</div>
            <div className="text-sm font-semibold font-mono text-slate-200">{breakdown.windows.toLocaleString()} <span className="text-xs text-slate-400 font-normal">分</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
