import React from 'react';
import { Cpu, AlertTriangle, CheckCircle2, Monitor, Apple, Terminal } from 'lucide-react';
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

  // プログレスバーのカラー判定
  let barGradient = 'from-emerald-500 to-teal-400';
  let badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

  if (usagePercentage >= 90) {
    barGradient = 'from-rose-500 to-red-600';
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  } else if (usagePercentage >= 75) {
    barGradient = 'from-amber-500 to-yellow-400';
    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
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
            {usagePercentage >= 90 ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {usagePercentage}% 使用中
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5 mb-5">
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
            style={{ width: `${Math.min(100, Math.max(2, usagePercentage))}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>{totalMinutesUsed.toLocaleString()} min used</span>
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
