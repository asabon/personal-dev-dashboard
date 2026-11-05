import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Lock,
  Globe,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { RepositoryDashboardData } from '../types';
import { PullRequestCard } from './PullRequestCard';

interface RepoCardProps {
  repo: RepositoryDashboardData;
  isCompact?: boolean;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, isCompact = false }) => {
  const totalPrs = repo.pullRequests.length;
  const failedPrs = repo.pullRequests.filter((pr) => pr.overallCiState === 'FAILURE');
  const runningPrs = repo.pullRequests.filter((pr) => pr.overallCiState === 'PENDING');
  const passedPrs = repo.pullRequests.filter((pr) => pr.overallCiState === 'SUCCESS');
  const noCiPrs = repo.pullRequests.filter((pr) => pr.overallCiState === 'NONE');

  // isCompact 時は初期折りたたみ（クリックで開閉）
  const [isExpanded, setIsExpanded] = useState(!isCompact);

  useEffect(() => {
    setIsExpanded(!isCompact);
  }, [isCompact]);

  const cardId = `repo-${repo.fullName.replace('/', '-')}`;

  return (
    <div
      id={cardId}
      className="glass-panel rounded-2xl border border-slate-800/80 shadow-lg overflow-hidden flex flex-col transition-all duration-200"
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 sm:px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/60 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FolderGit2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-bold text-slate-100 hover:text-indigo-400 transition-colors truncate font-mono"
          >
            {repo.fullName}
          </a>

          {repo.isPrivate ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
              <Lock className="w-2.5 h-2.5" /> Private
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
              <Globe className="w-2.5 h-2.5" /> Public
            </span>
          )}
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono shrink-0">
            {totalPrs}件
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 font-mono text-xs">
          {totalPrs === 0 ? (
            <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
              0 PR
            </span>
          ) : passedPrs.length === totalPrs ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>All Passed</span>
            </span>
          ) : (
            <>
              {runningPrs.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />
                  <span>{runningPrs.length} Running</span>
                </span>
              )}
              {failedPrs.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 shrink-0">
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{failedPrs.length} Failed</span>
                </span>
              )}
              {passedPrs.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{passedPrs.length} Passed</span>
                </span>
              )}
              {noCiPrs.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                  {noCiPrs.length} No CI
                </span>
              )}
            </>
          )}

          <div className="p-0.5 text-slate-400 hover:text-slate-200">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Content Body */}
      {isExpanded && (
        <div className="p-3 sm:p-4 flex-1">
          {repo.error ? (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">取得エラー</p>
                <p className="text-rose-400/80 mt-0.5">{repo.error}</p>
              </div>
            </div>
          ) : repo.pullRequests.length === 0 ? (
            <div className="py-6 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-slate-700" />
              <p className="text-xs font-medium">現在 Open な Pull Request はありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {repo.pullRequests.map((pr) => (
                <PullRequestCard key={pr.id} pr={pr} isCompact={isCompact} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
