import React from 'react';
import { RefreshCw, Settings, ShieldCheck, Activity, Clock, Minimize2, Maximize2 } from 'lucide-react';
import type { RateLimitInfo } from '../services/githubApi';

interface HeaderProps {
  username: string;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  rateLimit: RateLimitInfo | null;
  viewMode?: 'compact' | 'expanded';
  onToggleViewMode?: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  isRefreshing,
  lastRefreshedAt,
  rateLimit,
  viewMode = 'expanded',
  onToggleViewMode,
  onRefresh,
  onOpenSettings,
}) => {
  const formatTime = (date: Date | null) => {
    if (!date) return '未更新';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const isCompact = viewMode === 'compact';

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                Personal Dev Dashboard
              </h1>
              <a
                href="https://github.com/asabon/personal-dev-dashboard/releases"
                target="_blank"
                rel="noreferrer"
                title={`バージョン v${__APP_VERSION__} のリリースノートを開く`}
                className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60 hover:border-slate-600 transition-colors"
              >
                v{__APP_VERSION__}
              </a>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                OSS
              </span>
            </div>
            {username && (
              <p className="text-xs text-slate-400">
                Logged in as <span className="text-slate-200 font-medium">@{username}</span>
              </p>
            )}
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Rate Limit Badge */}
          {rateLimit && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-help"
              title={`GitHub API レート制限の残数（1時間上限: ${rateLimit.limit}回）\n枠のリセット予定: ${rateLimit.resetAt.toLocaleTimeString()}`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>API残数:</span>
              <span className="font-mono font-medium text-slate-100">
                {rateLimit.remaining}
              </span>
              <span className="text-slate-500">/ {rateLimit.limit}</span>
            </div>
          )}

          {/* Last Refreshed */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatTime(lastRefreshedAt)}</span>
          </div>

          {/* View Mode Toggle Button */}
          {onToggleViewMode && (
            <button
              type="button"
              onClick={onToggleViewMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 cursor-pointer ${
                isCompact
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                  : 'bg-slate-900 text-slate-300 hover:text-slate-100 border-slate-800 hover:bg-slate-800'
              }`}
              title={isCompact ? '詳細表示モードに切り替え' : '簡易表示モードに切り替え'}
              aria-label={isCompact ? '詳細表示に切り替え' : '簡易表示に切り替え'}
            >
              {isCompact ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">簡易表示</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">詳細表示</span>
                </>
              )}
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="最新データを再取得"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">更新</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:text-white transition-all cursor-pointer"
            title="設定"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
