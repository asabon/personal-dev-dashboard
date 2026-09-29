import React from 'react';
import {
  XCircle,
  Loader2,
  CheckCircle2,
  ArrowDown,
} from 'lucide-react';
import type { RepositoryDashboardData } from '../types';
import type { FeatureAlert } from '../features/types';

interface DashboardSummaryBarProps {
  projects: RepositoryDashboardData[];
  featureAlerts?: FeatureAlert[];
}

export const DashboardSummaryBar: React.FC<DashboardSummaryBarProps> = ({
  projects,
  featureAlerts = [],
}) => {
  // 1. CI 失敗 / 実行中 PR の集計
  let failedPrCount = 0;
  let runningPrCount = 0;
  let firstFailedRepo: string | null = null;
  let firstRunningRepo: string | null = null;

  for (const project of projects) {
    for (const pr of project.pullRequests) {
      if (pr.overallCiState === 'FAILURE') {
        failedPrCount++;
        if (!firstFailedRepo) firstFailedRepo = project.fullName;
      } else if (pr.overallCiState === 'PENDING') {
        runningPrCount++;
        if (!firstRunningRepo) firstRunningRepo = project.fullName;
      }
    }
  }

  const hasFeatureIssues = featureAlerts.some((alert) => alert.tone === 'danger');
  const hasFeatureWarnings = featureAlerts.length > 0;
  const hasIssues = failedPrCount > 0 || hasFeatureIssues;
  const isAllClear = !hasIssues && runningPrCount === 0 && !hasFeatureWarnings;

  // スクロール用ヘルパー
  const scrollToElement = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // アニメーション効果を付与するために一時的にハイライト
      el.classList.add('ring-2', 'ring-indigo-400');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-400');
      }, 1500);
    }
  };

  return (
    <div
      aria-label="ダッシュボード状況サマリー"
      className="glass-panel rounded-2xl p-3 sm:p-4 border border-slate-800/80 shadow-lg flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs"
    >
      <span className="font-semibold text-slate-300 flex items-center gap-1.5 shrink-0 mr-1">
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              hasIssues ? 'bg-rose-400' : runningPrCount > 0 || hasFeatureWarnings ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              hasIssues ? 'bg-rose-500' : runningPrCount > 0 || hasFeatureWarnings ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
        </span>
        <span>状況サマリー:</span>
      </span>

      {isAllClear && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>異常なし</span>
        </div>
      )}

      {/* 1. CI 失敗アラート */}
      {failedPrCount > 0 && (
          <button
            type="button"
            onClick={() => firstFailedRepo && scrollToElement(`repo-${firstFailedRepo.replace('/', '-')}`)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all font-semibold active:scale-95 cursor-pointer shadow-sm shadow-rose-500/10"
            title="CI失敗が発生しているリポジトリへ移動"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>CI 失敗: {failedPrCount}件</span>
            <ArrowDown className="w-3 h-3 text-rose-400 opacity-70" />
          </button>
        )}

        {/* 2. CI 実行中バッジ */}
        {runningPrCount > 0 && (
          <button
            type="button"
            onClick={() => firstRunningRepo && scrollToElement(`repo-${firstRunningRepo.replace('/', '-')}`)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition-all active:scale-95 cursor-pointer"
            title="実行中PRへ移動"
          >
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>CI 実行中: {runningPrCount}件</span>
            <ArrowDown className="w-3 h-3 text-amber-400 opacity-70" />
          </button>
        )}

        {featureAlerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            onClick={() => scrollToElement(alert.targetId)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer ${
              alert.tone === 'danger'
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30 font-semibold'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20'
            }`}
            title={`${alert.label}へ移動`}
          >
            {alert.icon}
            <span>{alert.label}</span>
            <ArrowDown className={`w-3.5 h-3.5 opacity-70 ${alert.tone === 'danger' ? 'text-rose-400' : 'text-amber-400'}`} />
          </button>
        ))}
    </div>
  );
};
