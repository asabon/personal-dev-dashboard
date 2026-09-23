import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  ChevronDown,
  ChevronUp,
  XCircle,
  Loader2,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import type { RepositoryDashboardData } from '../types';
import { RepoCard } from './RepoCard';

interface RepositoriesCardProps {
  repositories: string[];
  projects: RepositoryDashboardData[];
  isCompact?: boolean;
  onOpenSettings?: () => void;
}

export const RepositoriesCard: React.FC<RepositoriesCardProps> = ({
  repositories,
  projects,
  isCompact = false,
  onOpenSettings,
}) => {
  // サマリー計算
  // 監視中の全リポジトリに含まれる PR を集約
  const allPrs = projects.flatMap((p) => p.pullRequests);
  const totalPrs = allPrs.length;
  const failedPrs = allPrs.filter((pr) => pr.overallCiState === 'FAILURE');
  const runningPrs = allPrs.filter((pr) => pr.overallCiState === 'PENDING');
  const passedPrs = allPrs.filter((pr) => pr.overallCiState === 'SUCCESS');

  // リポジトリ自体のエラー
  const erroredRepos = projects.filter((p) => Boolean(p.error));
  const hasFailure = failedPrs.length > 0 || erroredRepos.length > 0;

  // isCompact 時は失敗リポジトリがある場合を除き初期折りたたみ
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (isCompact) {
      return !hasFailure;
    }
    return false;
  });

  useEffect(() => {
    if (isCompact) {
      setIsCollapsed(!hasFailure);
    } else {
      setIsCollapsed(false);
    }
  }, [isCompact, hasFailure]);

  return (
    <div
      id="repositories-section"
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
              <FolderGit2 className="w-4 h-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight whitespace-nowrap">
                  監視リポジトリ
                </h2>
                <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono shrink-0">
                  {repositories.length}リポジトリ
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden md:block">
                CIパイプライン実行状況および Open PR の監視
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

        {/* ヘッダー右側（スマホ時は2行目）: サマリーバッジ & PC開閉アイコン */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-0.5 sm:pt-0">
          {/* サマリーバッジ */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono">
              {erroredRepos.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                  <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{erroredRepos.length} リポエラー</span>
                </span>
              )}
              {failedPrs.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                  <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                  <span>{failedPrs.length} {failedPrs.length === 1 ? 'PR' : 'PRs'} failed</span>
                </span>
              )}
              {runningPrs.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                  <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                  <span>{runningPrs.length} {runningPrs.length === 1 ? 'PR' : 'PRs'} running</span>
                </span>
              )}
              {failedPrs.length === 0 && erroredRepos.length === 0 && runningPrs.length === 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{totalPrs > 0 ? `${totalPrs} PRs All passed` : 'PRなし'}</span>
                </span>
              )}
              {(failedPrs.length > 0 || runningPrs.length > 0) && passedPrs.length > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span>{passedPrs.length} {passedPrs.length === 1 ? 'PR' : 'PRs'} passed</span>
                </span>
              )}
              {totalPrs > 0 && (failedPrs.length > 0 || runningPrs.length > 0) && passedPrs.length === 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-400 shrink-0">
                  {totalPrs} PRs
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

      {/* Body: リポジトリカード一覧 (アコーディオン開閉) */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-800/50 mt-1">
          {repositories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-3 mt-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                  監視対象のリポジトリが登録されていません
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  設定（⚙️）から監視したいリポジトリ（例: <code className="text-slate-400">owner/repo</code>）を登録してください。
                </p>
              </div>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <Settings className="w-4 h-4" /> 設定を開く
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 pt-3">
              {projects.map((repo) => (
                <RepoCard
                  key={repo.fullName}
                  repo={repo}
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
