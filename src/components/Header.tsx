import React from 'react';
import { RefreshCw, Settings, Activity, Clock, Minimize2, Maximize2 } from 'lucide-react';
import type { RateLimitInfo } from '../services/githubApi';

interface HeaderProps {
  username?: string;
  isRefreshing: boolean;
  lastRefreshedAt: Date | null;
  rateLimit?: RateLimitInfo | null;
  viewMode?: 'compact' | 'expanded';
  onToggleViewMode?: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isRefreshing,
  lastRefreshedAt,
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
            <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              Personal Dev Dashboard
            </h1>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
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
