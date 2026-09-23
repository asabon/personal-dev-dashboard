import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ChevronDown,
  ChevronUp,
  Building2,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Tag,
  Laptop,
} from 'lucide-react';
import type { SelfHostedRunner } from '../types';

interface RunnersCardProps {
  runners: SelfHostedRunner[];
  isLoading: boolean;
  error: string | null;
  isCompact?: boolean;
}

interface RunnerCardProps {
  runner: SelfHostedRunner;
  isCompact?: boolean;
}

export const RunnerCard: React.FC<RunnerCardProps> = ({ runner, isCompact = false }) => {
  const isOnline = runner.status === 'online';
  const isBusy = runner.busy;
  const isOffline = runner.status === 'offline';

  // 開閉状態: 詳細モード(isCompact=false)は全開、簡易モード(isCompact=true)は初期折りたたみ（オフラインマシンのみ注意喚起のため展開）
  const [isExpanded, setIsExpanded] = useState(() => {
    if (isCompact) {
      return isOffline;
    }
    return true;
  });

  useEffect(() => {
    if (isCompact) {
      setIsExpanded(isOffline);
    } else {
      setIsExpanded(true);
    }
  }, [isCompact, isOffline]);

  return (
    <div className="rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all overflow-hidden shadow-sm">
      {/* 1行ヘッダー (クリックで詳細開閉) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 sm:p-3.5 bg-slate-900/40 hover:bg-slate-900/60 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="font-bold text-xs text-slate-200 truncate font-mono" title={runner.name}>
            {runner.name}
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0 truncate">
            {runner.scopeType === 'org' ? (
              <>
                <Building2 className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                <span>Org: {runner.scopeName}</span>
              </>
            ) : (
              <>
                <FolderGit2 className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                <span>Repo: {runner.scopeName}</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* ステータスバッジ */}
          {isBusy ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
              Busy (実行中)
            </span>
          ) : isOnline ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Offline
            </span>
          )}

          {/* 開閉 Chevron アイコン */}
          <div className="p-0.5 text-slate-400 hover:text-slate-200 transition-colors shrink-0">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* 詳細アコーディオン (OS + ラベル一覧) */}
      {isExpanded && (
        <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium">OS:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px] font-semibold">
              {runner.os}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 font-medium">Labels:</span>
            {runner.labels
              .filter((l) => l !== 'self-hosted' && l.toLowerCase() !== runner.os.toLowerCase())
              .map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[10px]"
                >
                  <Tag className="w-2.5 h-2.5 text-indigo-400" />
                  {label}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const RunnersCard: React.FC<RunnersCardProps> = ({
  runners,
  isLoading,
  error,
  isCompact = false,
}) => {
  const totalCount = runners.length;
  const busyCount = runners.filter((r) => r.busy).length;
  const onlineCount = runners.filter((r) => r.status === 'online').length;
  const offlineCount = runners.filter((r) => r.status === 'offline').length;
  const hasError = Boolean(error);
  const hasFailureOrOffline = hasError || offlineCount > 0;

  // isCompact 時はエラーまたはオフラインがある場合を除き初期折りたたみ
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (isCompact) {
      return !hasFailureOrOffline;
    }
    return false;
  });

  useEffect(() => {
    if (isCompact) {
      setIsCollapsed(!hasFailureOrOffline);
    } else {
      setIsCollapsed(false);
    }
  }, [isCompact, hasFailureOrOffline]);

  return (
    <div
      id="runners-section"
      className="glass-panel rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden transition-all duration-200"
    >
      {/* Header */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 cursor-pointer hover:bg-slate-800/30 transition-colors select-none"
      >
        <div className="flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
              <Cpu className="w-4 h-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight whitespace-nowrap">
                  Self-hosted Runners
                </h2>
                <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono shrink-0">
                  {runners.length}台
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden md:block">
                自前マシン・自宅サーバーの稼働ステータス監視
              </p>
            </div>
          </div>

          {/* スマホ表示時の開閉アイコン（1行目右端） */}
          <div className="sm:hidden p-0.5 text-slate-400 hover:text-slate-100 shrink-0">
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* サマリーと開閉ボタン（スマホ時は2行目） */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-0.5 sm:pt-0">
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono">
            {hasError && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>取得エラーあり</span>
              </span>
            )}
            {offlineCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>{offlineCount}台 Offline</span>
              </span>
            )}
            {totalCount > 0 && offlineCount === 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{onlineCount}/{totalCount} Online</span>
              </span>
            )}
            {totalCount > 0 && offlineCount > 0 && (
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-400 shrink-0">
                <span>{onlineCount}/{totalCount} Online</span>
              </span>
            )}
            {busyCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold shrink-0">
                <PlayCircle className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                <span>{busyCount}台 Running</span>
              </span>
            )}
            {totalCount === 0 && !hasError && (
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-400 shrink-0">
                0台
              </span>
            )}
          </div>

          {/* PC表示時の開閉アイコン */}
          <div className="hidden sm:block p-0.5 sm:p-1 rounded-lg text-slate-400 hover:text-slate-100 transition-colors shrink-0">
            {isCollapsed ? (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </div>
        </div>
      </div>

      {/* Body (アコーディオン開閉) */}
      {!isCollapsed && (
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-slate-800/60">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Cpu className="w-4 h-4 animate-spin text-indigo-400" />
              <span>セルフホステッドランナーの稼働状況を確認中...</span>
            </div>
          ) : runners.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-400 font-medium">
                接続されているセルフホステッドランナーはありません
              </p>
              <p className="text-[11px] text-slate-500">
                ※ セルフホステッドランナーをご利用でない場合は、右上の設定（歯車アイコン）から本パネルを非表示にできます。
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {runners.map((runner) => (
                <RunnerCard
                  key={`${runner.scopeType}-${runner.scopeName}-${runner.id}`}
                  runner={runner}
                  isCompact={isCompact}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
