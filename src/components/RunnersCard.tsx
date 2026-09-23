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

export const RunnersCard: React.FC<RunnersCardProps> = ({
  runners,
  isLoading,
  error,
  isCompact = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(isCompact);

  useEffect(() => {
    setIsCollapsed(isCompact);
  }, [isCompact]);

  const onlineCount = runners.filter((r) => r.status === 'online').length;
  const busyCount = runners.filter((r) => r.busy).length;
  const offlineCount = runners.filter((r) => r.status === 'offline').length;

  return (
    <div
      id="runners-section"
      className="glass-panel rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden transition-all duration-200"
    >
      {/* Header */}
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 tracking-tight">
                Self-hosted Runners
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                {runners.length}台
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              自前マシン・自宅サーバーの稼働ステータス監視
            </p>
          </div>
        </div>

        {/* サマリーと開閉ボタン */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {runners.length > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-mono">
              {busyCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <PlayCircle className="w-3 h-3 animate-spin" />
                  <span>{busyCount}<span className="hidden sm:inline"> 実行中</span></span>
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>{onlineCount}<span className="hidden sm:inline"> Online</span></span>
              </span>
              {offlineCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertCircle className="w-3 h-3" />
                  <span>{offlineCount}<span className="hidden sm:inline"> Offline</span></span>
                </span>
              )}
            </div>
          )}

          <div className="p-0.5 sm:p-1 rounded-lg text-slate-400 hover:text-slate-100 transition-colors">
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
        <div className="px-6 pb-6 pt-2 border-t border-slate-800/60">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {runners.map((runner) => {
                const isOnline = runner.status === 'online';
                const isBusy = runner.busy;

                return (
                  <div
                    key={`${runner.scopeType}-${runner.scopeName}-${runner.id}`}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between space-y-3"
                  >
                    {/* 上部: ホスト名とステータス */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                          <span
                            className="font-bold text-xs text-slate-200 truncate font-mono"
                            title={runner.name}
                          >
                            {runner.name}
                          </span>
                        </div>

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
                      </div>

                      {/* スコープバッジ（Org共有 vs Repo専用） */}
                      <div className="mt-2.5 flex items-center">
                        {runner.scopeType === 'org' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 max-w-full truncate">
                            <Building2 className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="truncate">Org: {runner.scopeName} (共有)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 max-w-full truncate">
                            <FolderGit2 className="w-3 h-3 text-blue-400 shrink-0" />
                            <span className="truncate">Repo: {runner.scopeName}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 下部: OS と ラベル一覧 */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {runner.os}
                      </span>
                      {runner.labels
                        .filter((l) => l !== 'self-hosted' && l.toLowerCase() !== runner.os.toLowerCase())
                        .slice(0, 3)
                        .map((label) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 font-mono"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {label}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
