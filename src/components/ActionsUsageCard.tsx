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
import type { ActionsUsage, ActionsUsageAccount, ActionsUsageItem } from '../types';
import { calculateActionsPacing } from '../utils/actionsUsage';

interface AccountUsageCardProps {
  account: ActionsUsageAccount;
  usage: ActionsUsage | null;
  error?: string | null;
  isLoading?: boolean;
  isCompact?: boolean;
}

export const AccountUsageCard: React.FC<AccountUsageCardProps> = ({
  account,
  usage,
  error,
  isLoading,
  isCompact = false,
}) => {
  const Icon = account.type === 'org' ? Building2 : User;
  const label = account.type === 'org' ? 'Org' : '個人';

  const remainingMinutes = usage
    ? Math.max(0, usage.includedMinutes - usage.totalMinutesUsed)
    : 0;
  const isLowRemaining = remainingMinutes < 200;
  const isHighUsage = usage ? usage.usagePercentage >= 85 : false;
  const pace = usage
    ? calculateActionsPacing(usage.totalMinutesUsed, usage.includedMinutes, usage.usagePercentage)
    : null;
  const isPaceWarning = pace ? pace.paceStatusText !== '順調 (目安内)' : false;
  const hasWarning = Boolean(error || isLowRemaining || isHighUsage || isPaceWarning);

  // 個別アカウントの開閉状態:
  // 詳細表示時 (isCompact=false) は詳細まで全開、簡易表示時 (isCompact=true) は警告/エラーがあるもののみ展開（正常アカウントは1行表示）
  const [isExpanded, setIsExpanded] = useState(() => {
    if (isCompact) {
      return hasWarning;
    }
    return true;
  });

  useEffect(() => {
    if (isCompact) {
      setIsExpanded(hasWarning);
    } else {
      setIsExpanded(true);
    }
  }, [isCompact, hasWarning]);

  const [showBreakdown, setShowBreakdown] = useState(!isCompact);

  useEffect(() => {
    setShowBreakdown(!isCompact);
  }, [isCompact]);

  // 1. ローディング状態
  if (isLoading && !usage && !error) {
    return (
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-slate-800 rounded" />
          <div className="h-5 w-16 bg-slate-800 rounded-full" />
        </div>
        <div className="h-8 w-40 bg-slate-800 rounded" />
        <div className="h-3 w-full bg-slate-800 rounded-full" />
      </div>
    );
  }

  // 2. エラー状態
  if (error) {
    return (
      <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-md transition-all">
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3.5 sm:p-4 bg-slate-900/40 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-900/60 transition-colors select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-200 text-sm font-mono truncate">{account.name}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium shrink-0">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
              取得エラー
            </span>
            <div className="p-0.5 text-slate-400 hover:text-slate-200 transition-colors shrink-0">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="p-4 pt-2 border-t border-slate-800/60">
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">使用量を取得できませんでした</p>
                <p className="text-amber-400/80 mt-0.5 text-[11px]">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. データなし
  if (!usage || !pace) {
    return null;
  }

  const { totalMinutesUsed, includedMinutes, usagePercentage, breakdown } = usage;
  const {
    expectedPercentage,
    expectedMinutes,
    paceStatusText,
    barGradient,
    badgeColor,
  } = pace;

  const PaceIcon =
    paceStatusText === '残り僅か' || paceStatusText === 'ハイペース'
      ? AlertTriangle
      : paceStatusText === 'やや速い'
        ? AlertCircle
        : CheckCircle2;

  const remPercent = Math.max(0, 100 - usagePercentage);

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 overflow-hidden transition-all shadow-md">
      {/* Header: Click to collapse / expand */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 sm:p-4 bg-slate-900/40 hover:bg-slate-900/60 flex items-center justify-between gap-2.5 cursor-pointer transition-colors select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="font-bold text-slate-100 text-sm font-mono truncate">
            {account.name}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium shrink-0">
            {label}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* サマリー残量バッジ */}
          <div
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md border flex items-baseline gap-1 ${
              isLowRemaining
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/80'
            }`}
          >
            <span className={isLowRemaining ? 'text-rose-400' : 'text-emerald-400'}>
              残{remainingMinutes.toLocaleString()}分
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({remPercent}%)
            </span>
          </div>

          {/* ペースバッジ（画面幅に余裕があるとき） */}
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor} hidden sm:flex items-center gap-1`}
          >
            <PaceIcon className="w-3 h-3 shrink-0" />
            <span>{paceStatusText}</span>
          </span>

          {/* 開閉アイコン */}
          <div className="p-0.5 text-slate-400 hover:text-slate-200 transition-colors shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </div>
      </div>

      {/* Body: 詳細メトリクス・プログレスバー・OS内訳 */}
      {isExpanded && (
        <div className="p-4 sm:p-5 pt-3 border-t border-slate-800/60 space-y-3.5">
          {/* Main Metrics: Remaining Minutes First */}
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">残り無料枠 (目安)</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span
                  className={`text-2xl sm:text-3xl font-bold font-mono ${
                    isLowRemaining ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {remainingMinutes.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">分</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  (枠の {remPercent}%)
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block font-medium">当月使用量</span>
              <div className="mt-0.5">
                <span className="text-base sm:text-lg font-bold font-mono text-slate-200">
                  {totalMinutesUsed.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-normal"> / {includedMinutes.toLocaleString()} 分</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {usagePercentage}% 消費
              </span>
            </div>
          </div>

          {/* Progress Bar with Pacing Line Overlay */}
          <div className="space-y-1">
            <div className="relative">
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
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
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>0 分</span>
              <div className="flex items-center gap-1 text-slate-400 font-sans">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_4px_rgba(56,189,248,0.8)]" />
                <span>目安: {expectedMinutes.toLocaleString()} 分 ({expectedPercentage}%)</span>
              </div>
              <span>{includedMinutes.toLocaleString()} 分</span>
            </div>
          </div>

          {/* OS Breakdown Collapsible Section */}
          <div className="pt-2 border-t border-slate-800/60">
            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-0.5 cursor-pointer"
              aria-expanded={showBreakdown}
            >
              <span>OS別 実稼働内訳</span>
              <div className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300">
                <span>{showBreakdown ? '内訳を隠す' : '内訳を表示'}</span>
                {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </button>

            {showBreakdown && (
              <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-800/40">
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <Terminal className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-medium truncate">Ubuntu (x1)</div>
                    <div className="text-xs font-semibold font-mono text-slate-200 truncate">
                      {breakdown.ubuntu.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">分</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <Apple className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-medium truncate">macOS (x10)</div>
                    <div className="text-xs font-semibold font-mono text-slate-200 truncate">
                      {breakdown.macOS.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">分</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                  <Monitor className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-medium truncate">Windows (x2)</div>
                    <div className="text-xs font-semibold font-mono text-slate-200 truncate">
                      {breakdown.windows.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">分</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface ActionsUsageCardProps {
  accounts?: ActionsUsageAccount[];
  usageMap?: Record<string, ActionsUsageItem>;
  isLoading?: boolean;
  isCompact?: boolean;
  // 後方互換性用（単一アカウント渡しの場合）
  usage?: ActionsUsage | null;
  error?: string | null;
  selectedAccount?: string;
  onSelectAccount?: (accountName: string) => void;
}

export const ActionsUsageCard: React.FC<ActionsUsageCardProps> = ({
  accounts = [],
  usageMap = {},
  isLoading = false,
  isCompact = false,
  usage,
  error,
  selectedAccount,
}) => {
  // 単一渡し時のスケルトン・空状態ハンドリング
  if (accounts.length === 0 && !usage && !error) {
    if (isLoading) {
      return (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 animate-pulse space-y-4">
          <div className="h-6 w-56 bg-slate-800 rounded" />
          <div className="h-24 w-full bg-slate-800 rounded-xl" />
        </div>
      );
    }
    return null;
  }

  // アカウントリストの正規化（accounts が空の場合は単一 usage/error を元にフォールバック構築）
  const resolvedAccounts: ActionsUsageAccount[] =
    accounts.length > 0
      ? accounts
      : [
          {
            name: selectedAccount || usage?.accountName || '個人',
            type: usage?.accountType || 'user',
          },
        ];

  // 全アカウントの使用量ステータス集約（監視リポジトリカードと同様のサマリー計算）
  let hasError = false;
  let hasOverPace = false; // 目安越え (残り僅か / ハイペース / 残り200分未満 / 使用率90%以上)
  let hasNearPace = false; // 目安間近 (やや速い / 使用率85%以上)

  for (const acc of resolvedAccounts) {
    const item = usageMap[acc.name];
    const isSingleTarget = accounts.length === 0 || acc.name === selectedAccount || acc.name === usage?.accountName;
    const accUsage = item ? item.usage : (isSingleTarget ? (usage ?? null) : null);
    const accError = item ? item.error : (isSingleTarget ? (error ?? null) : null);

    if (accError) {
      hasError = true;
    } else if (accUsage) {
      const { totalMinutesUsed, includedMinutes, usagePercentage } = accUsage;
      const { paceStatusText } = calculateActionsPacing(totalMinutesUsed, includedMinutes, usagePercentage);
      const remainingMinutes = Math.max(0, includedMinutes - totalMinutesUsed);

      if (
        paceStatusText === '残り僅か' ||
        paceStatusText === 'ハイペース' ||
        remainingMinutes < 200 ||
        usagePercentage >= 90
      ) {
        hasOverPace = true;
      } else if (paceStatusText === 'やや速い' || usagePercentage >= 85) {
        hasNearPace = true;
      }
    }
  }

  const hasWarningOrError = hasError || hasOverPace || hasNearPace;

  // isCompact 時は警告/エラーがない限り初期折りたたみ
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (isCompact) {
      return !hasWarningOrError;
    }
    return false;
  });

  useEffect(() => {
    if (isCompact) {
      setIsCollapsed(!hasWarningOrError);
    } else {
      setIsCollapsed(false);
    }
  }, [isCompact, hasWarningOrError]);

  return (
    <div
      id="actions-usage-section"
      className="glass-panel rounded-2xl border border-slate-800/80 shadow-xl relative overflow-hidden transition-all duration-200"
    >
      {/* Background ambient glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row (クリックで開閉) */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer hover:bg-slate-900/40 transition-colors select-none"
      >
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
              <Cpu className="w-4 h-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 whitespace-nowrap">
                  GitHub Actions 使用状況
                </h2>
                <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono shrink-0">
                  {resolvedAccounts.length}アカウント
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden md:flex items-center gap-1.5">
                <span>当月無料枠の残量・稼働ペース</span>
                <span className="text-slate-600">•</span>
                <span className="relative group inline-flex items-center">
                  <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-400 cursor-help transition-colors" />
                  <span className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 top-full mt-2 hidden group-hover:block z-40 w-72 sm:w-80 p-3 bg-slate-900 border border-slate-700/90 rounded-xl text-[11px] leading-relaxed text-slate-300 shadow-2xl backdrop-blur-md pointer-events-none">
                    <span className="block font-semibold text-slate-200 mb-1 flex items-center gap-1.5 text-xs">
                      <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      GitHub API の集計仕様について
                    </span>
                    GitHub 公式の課金 API (Usage Summary) の仕様上、パブリックリポジトリでの無料実行時間も含んだ総稼働時間が集計されます。また、無料枠の消費計算には各 OS の消費倍率（Ubuntu: 1倍、macOS: 10倍、Windows: 2倍）が適用されています。
                  </span>
                </span>
              </p>
            </div>
          </div>

          {/* スマホ表示時の開閉アイコン（1行目右端） */}
          <div className="sm:hidden p-0.5 text-slate-400 hover:text-slate-200 shrink-0">
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* ヘッダー右側（スマホ時は2行目）: 全体サマリーバッジ & PC開閉アイコン */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-0.5 sm:pt-0">
          {/* 全体サマリーバッジ（監視リポジトリと同様に全体の概要をラベル形式で表示） */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono">
            {hasError && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>取得エラーあり</span>
              </span>
            )}
            {hasOverPace && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>目安越えあり</span>
              </span>
            )}
            {!hasOverPace && hasNearPace && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold shrink-0">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>目安間近あり</span>
              </span>
            )}
            {!hasError && !hasOverPace && !hasNearPace && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>全部目安以下</span>
              </span>
            )}
          </div>

          {/* PC表示時の開閉アイコン */}
          <div className="hidden sm:block p-0.5 sm:p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0">
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
        </div>
      </div>

      {/* Account Cards Grid (アコーディオン開閉) */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 pt-3 border-t border-slate-800/60">
          <div
            className={`grid grid-cols-1 ${
              resolvedAccounts.length > 1 ? 'lg:grid-cols-2' : ''
            } gap-3 items-start`}
          >
            {resolvedAccounts.map((acc) => {
              const item = usageMap[acc.name];
              const isSingleTarget = accounts.length === 0 || acc.name === selectedAccount || acc.name === usage?.accountName;
              const accUsage = item ? item.usage : (isSingleTarget ? (usage ?? null) : null);
              const accError = item ? item.error : (isSingleTarget ? (error ?? null) : null);
              const accLoading = item?.isLoading ?? isLoading;

              return (
                <AccountUsageCard
                  key={acc.name}
                  account={acc}
                  usage={accUsage}
                  error={accError}
                  isLoading={accLoading}
                  isCompact={isCompact}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
