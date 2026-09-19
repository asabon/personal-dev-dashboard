import React from 'react';
import { FolderGit2, Lock, Globe, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { RepositoryDashboardData } from '../types';
import { PullRequestCard } from './PullRequestCard';

interface RepoCardProps {
  repo: RepositoryDashboardData;
  onRemove: (fullName: string) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, onRemove }) => {
  return (
    <div className="glass-panel rounded-2xl border border-slate-800/80 shadow-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <FolderGit2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <a
            href={`https://github.com/${repo.fullName}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold text-slate-100 hover:text-indigo-400 transition-colors truncate font-mono"
          >
            {repo.fullName}
          </a>

          {repo.isPrivate ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
              <Lock className="w-2.5 h-2.5" /> Private
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
              <Globe className="w-2.5 h-2.5" /> Public
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {repo.pullRequests.length} PRs
          </span>

          <button
            type="button"
            onClick={() => onRemove(repo.fullName)}
            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="監視リストから削除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1">
        {repo.error ? (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold">取得エラー</p>
              <p className="text-rose-400/80 mt-0.5">{repo.error}</p>
            </div>
          </div>
        ) : repo.pullRequests.length === 0 ? (
          <div className="py-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-slate-700" />
            <p className="text-xs font-medium">現在 Open な Pull Request はありません</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {repo.pullRequests.map((pr) => (
              <PullRequestCard key={pr.id} pr={pr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
