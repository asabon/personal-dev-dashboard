import React, { useState } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  GitBranch,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { PullRequestItem, ActionCheck } from '../types';

interface PullRequestCardProps {
  pr: PullRequestItem;
}

export const PullRequestCard: React.FC<PullRequestCardProps> = ({ pr }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusBadge = () => {
    switch (pr.overallCiState) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passed</span>
          </span>
        );
      case 'FAILURE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Running</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <span>No CI</span>
          </span>
        );
    }
  };

  const getCheckIcon = (check: ActionCheck) => {
    if (check.status === 'IN_PROGRESS' || check.status === 'QUEUED') {
      return <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" />;
    }
    if (check.conclusion === 'SUCCESS') {
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (check.conclusion === 'FAILURE') {
      return <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    }
    return <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
  };

  const formatRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)}分前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
  };

  return (
    <div className="rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all p-4 space-y-3">
      {/* Top row: Title, Number, Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <GitPullRequest className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
          <div className="min-w-0">
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-slate-100 hover:text-indigo-400 transition-colors flex items-center gap-1.5 group"
            >
              <span className="truncate">{pr.title}</span>
              <span className="text-slate-500 font-normal">#{pr.number}</span>
              <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          </div>
        </div>

        <div className="shrink-0">{getStatusBadge()}</div>
      </div>

      {/* Meta row: Branch, Commit SHA, Author, Updated Time */}
      <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-400">
        <div className="flex items-center gap-1 font-mono text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-800">
          <GitBranch className="w-3 h-3 text-indigo-400" />
          <span className="truncate max-w-[140px]">{pr.headBranch}</span>
          <span className="text-slate-500">@</span>
          <span className="text-slate-400">{pr.shortSha}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {pr.author.avatarUrl ? (
            <img
              src={pr.author.avatarUrl}
              alt={pr.author.login}
              className="w-4 h-4 rounded-full border border-slate-700"
            />
          ) : null}
          <span>{pr.author.login}</span>
        </div>

        <div className="flex items-center gap-1 text-slate-500">
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(pr.updatedAt)}</span>
        </div>

        {pr.checks.length > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{pr.checks.length} Checks</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Expanded checks detail */}
      {isExpanded && pr.checks.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
          {pr.checks.map((check) => (
            <div
              key={check.id}
              className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-slate-950/50 border border-slate-800/40"
            >
              <div className="flex items-center gap-2 min-w-0">
                {getCheckIcon(check)}
                <span className="text-slate-300 font-mono truncate">{check.name}</span>
              </div>
              {check.detailsUrl ? (
                <a
                  href={check.detailsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-500 hover:text-indigo-400 transition-colors shrink-0 ml-2"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
