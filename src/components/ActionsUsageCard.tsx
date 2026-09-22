import React, { useState, useEffect } from 'react';
import {
  Cpu,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Monitor,
  Apple,
  Terminal,
  User,
  Building2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { ActionsUsage, ActionsUsageAccount } from '../types';
import { calculateActionsPacing } from '../utils/actionsUsage';

interface ActionsUsageCardProps {
  usage: ActionsUsage | null;
  error?: string | null;
  isLoading?: boolean;
  accounts?: ActionsUsageAccount[];
  selectedAccount?: string;
  isCompact?: boolean;
  onSelectAccount?: (accountName: string) => void;
}

export const ActionsUsageCard: React.FC<ActionsUsageCardProps> = ({
  usage,
  error,
  isLoading,
  accounts = [],
  selectedAccount,
  isCompact = false,
  onSelectAccount,
}) => {
  const [showBreakdown, setShowBreakdown] = useState(!isCompact);

  useEffect(() => {
    setShowBreakdown(!isCompact);
  }, [isCompact]);
  const currentAccountName = selectedAccount || usage?.accountName;
  const currentAccount = accounts.find((a) => a.name === currentAccountName);
  const isOrg = currentAccount?.type === 'org' || usage?.accountType === 'org';

  const renderAccountTabs = () => {
    if (!accounts || accounts.length <= 1) return null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
        {accounts.map((acc) => {
          const isSelected = acc.name === (selectedAccount || usage?.accountName);
          const Icon = acc.type === 'org' ? Building2 : User;
          const label = acc.type === 'org' ? 'Org' : '個人';
          return (
            <button
              key={acc.name}
              type="button"
              aria-label={`${acc.name} (${acc.type === 'org' ? 'Org' : '個人'})`}
              onClick={() => onSelectAccount?.(acc.name)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{acc.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  isSelected ? 'bg-indigo-700/70 text-indigo-100' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  if (isLoading && !usage && !error) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="h-6 w-56 bg-slate-800 rounded" />
          {accounts.length > 1 && <div className="h-8 w-48 bg-slate-800 rounded-xl" />}
        </div>
        <div className="h-4 w-full bg-slate-800 rounded mb-3" />
        <div className="h-8 w-64 bg-slate-800 rounded" />
      </div>
    );
  }

  // アカウント切り替えがある場合、エラーになってもタブは保持して表示する
  if (error) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">GitHub Actions 使用状況</h2>
                {currentAccountName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700">
                    {isOrg ? <Building2 className="w-3 h-3 text-indigo-400" /> : <User className="w-3 h-3 text-indigo-400" />}
                    <span>{currentAccountName}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">使用量データの取得に失敗しました</p>
            </div>
          </div>
          {renderAccountTabs()}
        </div>

        <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5 text-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-300">
              {currentAccountName ? `「${currentAccountName}」の使用量を取得できませんでした` : 'Actions 使用量の取得に失敗しました'}
            </p>
            <p className="text-xs text-amber-400/80 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!usage) return null;

  const { totalMinutesUsed, includedMinutes, usagePercentage, breakdown } = usage;
  const {
    daysInMonth,
    expectedPercentage,
    expectedMinutes,
    remainingMinutes,
    paceStatusText,
    barGradient,
    badgeColor,
  } = calculateActionsPacing(totalMinutesUsed, includedMinutes, usagePercentage);

  const PaceIcon =
    paceStatusText === '残り僅か' || paceStatusText === 'ハイペース'
      ? AlertTriangle
      : paceStatusText === 'やや速い'
        ? AlertCircle
        : CheckCircle2;

  return (
    <div id="actions-usage-section" className="glass-panel rounded-2xl p-6 border border-slate-800/80 shadow-xl relative overflow-hidden transition-all">
      {/* Background ambient glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                GitHub Actions 使用状況
              </h2>
              {currentAccountName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/90 text-slate-300 text-xs border border-slate-700 font-medium">
                  {isOrg ? <Building2 className="w-3 h-3 text-indigo-400" /> : <User className="w-3 h-3 text-indigo-400" />}
                  <span>{currentAccountName}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span>月間クォータ: {includedMinutes.toLocaleString()} 分（当月 1日〜{daysInMonth}日）</span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 text-slate-400">
                <span>総稼働時間集計</span>
                <span className="relative group inline-flex items-center">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-400 cursor-help transition-colors" />
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-40 w-72 sm:w-80 p-3 bg-slate-900 border border-slate-700/90 rounded-xl text-[11px] leading-relaxed text-slate-300 shadow-2xl backdrop-blur-md pointer-events-none">
                    <span className="block font-semibold text-slate-200 mb-1 flex items-center gap-1.5 text-xs">
                      <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      GitHub API の集計仕様について
                    </span>
                    GitHub 公式の課金 API (Usage Summary) の仕様上、パブリックリポジトリでの無料実行時間も含んだ総稼働時間が集計されます。また、無料枠の消費計算には各 OS の消費倍率（Ubuntu: 1倍、macOS: 10倍、Windows: 2倍）が適用されています。
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {renderAccountTabs()}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColor} flex items-center gap-1.5`}>
            <PaceIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{paceStatusText}</span>
          </span>
        </div>
      </div>

      {/* Metrics Row: Usage vs Remaining */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">当月の使用量 (換算目安)</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-100">
              {totalMinutesUsed.toLocaleString()}
            </span>
            <span className="text-slate-400 text-sm font-medium">
              / {includedMinutes.toLocaleString()} 分
            </span>
            <span className="text-xs font-semibold text-slate-300 ml-auto bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded-md">
              {usagePercentage}%
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-medium mb-1">残り無料枠 (目安)</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold font-mono ${remainingMinutes < 200 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {remainingMinutes.toLocaleString()}
            </span>
            <span className="text-slate-400 text-sm font-medium">分</span>
            <span className="text-xs text-slate-400 ml-auto">
              (枠の {100 - usagePercentage}%)
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar with Pacing Line Overlay */}
      <div className="space-y-1.5 mb-5">
        <div className="relative">
          {/* Progress Bar Track */}
          <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
              style={{ width: `${Math.min(100, Math.max(totalMinutesUsed > 0 ? 1 : 0, usagePercentage))}%` }}
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
          <span>0 分</span>
          <div className="flex items-center gap-1.5 text-slate-400 font-sans">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.8)]" />
            <span>本日目安: {expectedMinutes.toLocaleString()} 分 ({expectedPercentage}%)</span>
          </div>
          <span>{includedMinutes.toLocaleString()} 分</span>
        </div>
      </div>

      {/* OS Breakdown */}
      <div className="pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">OS別 実稼働内訳</span>
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors py-0.5 px-1.5 rounded hover:bg-indigo-500/10 cursor-pointer"
            aria-expanded={showBreakdown}
          >
            <span>{showBreakdown ? '内訳を隠す' : '内訳を表示'}</span>
            {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showBreakdown && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <Terminal className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Ubuntu (x1)</div>
                <div className="text-sm font-semibold font-mono text-slate-200">{breakdown.ubuntu.toLocaleString()} <span className="text-xs text-slate-400 font-normal">分</span></div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <Apple className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 font-medium">macOS (x10)</div>
                <div className="text-sm font-semibold font-mono text-slate-200">{breakdown.macOS.toLocaleString()} <span className="text-xs text-slate-400 font-normal">分</span></div>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Windows (x2)</div>
                <div className="text-sm font-semibold font-mono text-slate-200">{breakdown.windows.toLocaleString()} <span className="text-xs text-slate-400 font-normal">分</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
