import React, { useState, useEffect } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Clock,
  GitBranch,
  GitPullRequest,
  Tag,
  PlayCircle,
  ExternalLink,
  FolderGit2,
} from 'lucide-react';
import type { WorkflowRunItem } from '../types';

export interface ActionsStatusCardProps {
  runs: WorkflowRunItem[];
  isLoading: boolean;
  error: string | null;
  isCompact?: boolean;
}

export function isWorkflowRunFailed(run: WorkflowRunItem): boolean {
  return (
    run.status === 'completed' &&
    (run.conclusion === 'failure' ||
      run.conclusion === 'timed_out' ||
      run.conclusion === 'action_required')
  );
}

export function isWorkflowRunActive(run: WorkflowRunItem): boolean {
  return run.status !== 'completed';
}

export function isWorkflowRunPassed(run: WorkflowRunItem): boolean {
  return run.status === 'completed' && run.conclusion === 'success';
}

/**
 * 同一ワークフロー（リポジトリ × ワークフロー名 × PRブランチまたはデフォルト）ごとに最新の実行を採用し、
 * 「現在実行中（Running/Queued）」または「最新実行が失敗（Failed）のまま未解決」のものだけを抽出する。
 * 失敗後に再実行や後続コミット・後続タグで同ワークフローが成功した場合は自動的に除外される。
 */
export function selectAttentionWorkflowRuns(runs: WorkflowRunItem[]): WorkflowRunItem[] {
  // 新しい順（runNumber または updatedAt/createdAt の降順）に並べてから各ワークフローの最新状態を判定
  const sortedByNewest = [...runs].sort((a, b) => {
    const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return b.runNumber - a.runNumber;
  });

  const latestByWorkflowKey = new Map<string, WorkflowRunItem>();

  for (const run of sortedByNewest) {
    // PR トリガーはブランチ単位、それ以外（push / release / schedule / workflow_dispatch 等）はワークフロー単位で最新状態を追跡
    const scopeBranch =
      run.event === 'pull_request' || run.event === 'pull_request_target'
        ? run.headBranch
        : '__workflow_latest__';
    const key = `${run.repoFullName}::${run.workflowName}::${scopeBranch}`;

    if (!latestByWorkflowKey.has(key)) {
      latestByWorkflowKey.set(key, run);
    }
  }

  // 最新状態が「実行中」または「失敗」のワークフローのみ抽出
  const attentionRuns = Array.from(latestByWorkflowKey.values()).filter(
    (run) => isWorkflowRunActive(run) || isWorkflowRunFailed(run)
  );

  // 表示ソート順: 実行中 (Active) を最優先、次に失敗 (Failed) を更新日時の新しい順
  attentionRuns.sort((a, b) => {
    const aActive = isWorkflowRunActive(a) ? 1 : 0;
    const bActive = isWorkflowRunActive(b) ? 1 : 0;
    if (aActive !== bActive) {
      return bActive - aActive;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return attentionRuns;
}

const formatRelativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
};

const getEventBadge = (event: string) => {
  switch (event) {
    case 'release':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20 font-mono shrink-0">
          <Tag className="w-2.5 h-2.5 text-violet-400 shrink-0" />
          <span>release</span>
        </span>
      );
    case 'pull_request':
    case 'pull_request_target':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono shrink-0">
          <GitPullRequest className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
          <span>pull_request</span>
        </span>
      );
    case 'schedule':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono shrink-0">
          <Clock className="w-2.5 h-2.5 text-sky-400 shrink-0" />
          <span>schedule</span>
        </span>
      );
    case 'workflow_dispatch':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono shrink-0">
          <PlayCircle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
          <span>dispatch</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono shrink-0">
          <GitBranch className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
          <span>{event || 'push'}</span>
        </span>
      );
  }
};

const getRunStatusBadge = (run: WorkflowRunItem) => {
  if (isWorkflowRunActive(run)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono shrink-0">
        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
        <span>Running</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono shrink-0">
      <XCircle className="w-3 h-3 shrink-0" />
      <span>Failed</span>
    </span>
  );
};

const getRunStatusIcon = (run: WorkflowRunItem) => {
  if (isWorkflowRunActive(run)) {
    return <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />;
  }
  return <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />;
};

export const ActionsStatusCard: React.FC<ActionsStatusCardProps> = ({
  runs,
  isLoading,
  error,
  isCompact = false,
}) => {
  const attentionRuns = selectAttentionWorkflowRuns(runs);
  const runningRuns = attentionRuns.filter(isWorkflowRunActive);
  const failedRuns = attentionRuns.filter(isWorkflowRunFailed);
  const hasError = Boolean(error);

  const [isCollapsed, setIsCollapsed] = useState(isCompact);

  useEffect(() => {
    setIsCollapsed(isCompact);
  }, [isCompact]);

  return (
    <div
      id="workflow-runs-section"
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
              <Activity className="w-4 h-4 shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight whitespace-nowrap">
                  Actions Status
                </h2>
                <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono shrink-0">
                  {attentionRuns.length}件
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 hidden md:block">
                実行中および失敗状態のワークフロー監視（再実行・修正で成功すると自動で消えます）
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
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono">
            {hasError && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>取得エラーあり</span>
              </span>
            )}
            {runningRuns.length > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold shrink-0">
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
                <span>{runningRuns.length} Running</span>
              </span>
            )}
            {failedRuns.length > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold shrink-0">
                <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span>{failedRuns.length} Failed</span>
              </span>
            )}
            {runningRuns.length === 0 && failedRuns.length === 0 && !hasError && (
              <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>All Passed</span>
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

      {/* Body: 実行中・失敗中のワークフロー一覧 */}
      {!isCollapsed && (
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-3 border-t border-slate-800/60">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>直近の Actions 実行状況を確認中...</span>
            </div>
          ) : attentionRuns.length === 0 ? (
            <div className="py-6 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="w-7 h-7 text-emerald-500/40" />
              <p className="text-xs font-medium text-slate-400">
                現在、実行中または失敗状態の Actions はありません
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {attentionRuns.map((run) => (
                <div
                  key={`${run.repoFullName}-${run.id}`}
                  className={`rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/90 hover:border-slate-700 transition-all ${
                    isCompact ? 'p-2.5 sm:p-3 space-y-1.5' : 'p-3.5 sm:p-4 space-y-2'
                  }`}
                >
                  {/* 1行目: ステータスアイコン + リポジトリバッジ + ワークフロー名 & タイトル + 右端ステータス */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {getRunStatusIcon(run)}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700 font-mono shrink-0">
                            <FolderGit2 className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                            <span>Repo: {run.repoFullName}</span>
                          </span>
                          <span className="text-xs font-bold text-indigo-300 font-mono">
                            {run.workflowName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            #{run.runNumber}
                          </span>
                        </div>
                        <a
                          href={run.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs sm:text-sm font-semibold text-slate-100 hover:text-indigo-400 transition-colors flex items-center gap-1.5 group"
                        >
                          <span className="truncate">{run.displayTitle}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </a>
                      </div>
                    </div>

                    <div className="shrink-0">{getRunStatusBadge(run)}</div>
                  </div>

                  {/* 2行目: イベントトリガー + ブランチ/タグ + SHA + 実行者 & 時刻 */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-[11px] text-slate-400 pl-6">
                    {getEventBadge(run.event)}

                    {run.headBranch && (
                      <div className="flex items-center gap-1 font-mono text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-800">
                        {run.event === 'release' ? (
                          <Tag className="w-3 h-3 text-violet-400 shrink-0" />
                        ) : (
                          <GitBranch className="w-3 h-3 text-indigo-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[160px]">{run.headBranch}</span>
                        {run.shortSha && !isCompact && (
                          <>
                            <span className="text-slate-500">@</span>
                            <span className="text-slate-400">{run.shortSha}</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {!isCompact && run.actor.avatarUrl ? (
                        <img
                          src={run.actor.avatarUrl}
                          alt={run.actor.login}
                          className="w-3.5 h-3.5 rounded-full border border-slate-700"
                        />
                      ) : null}
                      <span>@{run.actor.login}</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-500 ml-auto">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(run.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
