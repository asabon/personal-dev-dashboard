import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import type { DashboardFeatureDefinition } from '../features/types';
import {
  OVERALL_DEBUG_PRESETS,
  REPOSITORIES_DEBUG_SCENARIOS,
  RATE_LIMIT_DEBUG_SCENARIOS,
  type OverallDebugPreset,
} from '../data/coreDebugScenarios';

export interface DebugBarProps {
  features: DashboardFeatureDefinition[];
  selectedPresetId: string | null;
  featureScenarioSelections: Record<string, string>;
  repositoriesScenarioId: string;
  rateLimitScenarioId: string;
  onSelectPreset: (preset: OverallDebugPreset) => void;
  onSelectFeatureScenario: (featureId: string, scenarioId: string) => void;
  onSelectRepositoriesScenario: (scenarioId: string) => void;
  onSelectRateLimitScenario: (scenarioId: string) => void;
}

const PRESET_STYLES: Record<OverallDebugPreset['badgeTone'], { active: string; idle: string }> = {
  emerald: {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-500/10 shadow-sm',
    idle: 'bg-slate-900/60 text-emerald-400/80 border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-500/10',
  },
  amber: {
    active: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10 shadow-sm',
    idle: 'bg-slate-900/60 text-amber-400/80 border-slate-800 hover:border-amber-500/30 hover:bg-amber-500/10',
  },
  rose: {
    active: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-500/10 shadow-sm',
    idle: 'bg-slate-900/60 text-rose-400/80 border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/10',
  },
  slate: {
    active: 'bg-slate-700/50 text-slate-200 border-slate-500 shadow-sm',
    idle: 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40',
  },
  violet: {
    active: 'bg-violet-500/20 text-violet-300 border-violet-500/50 shadow-violet-500/10 shadow-sm',
    idle: 'bg-slate-900/60 text-violet-400/80 border-slate-800 hover:border-violet-500/30 hover:bg-violet-500/10',
  },
};

export const DebugBar: React.FC<DebugBarProps> = ({
  features,
  selectedPresetId,
  featureScenarioSelections,
  repositoriesScenarioId,
  rateLimitScenarioId,
  onSelectPreset,
  onSelectFeatureScenario,
  onSelectRepositoriesScenario,
  onSelectRateLimitScenario,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      data-testid="debug-bar"
      className="bg-slate-900/95 border-b border-indigo-500/30 backdrop-blur-md shadow-xl transition-all"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* 左側: バッジ & プリセット切り替え */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
              <Bug className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>DEBUG MODE</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="全域プリセット切替">
              <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">一括プリセット:</span>
              {OVERALL_DEBUG_PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const style = PRESET_STYLES[preset.badgeTone];
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectPreset(preset)}
                    className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-all ${
                      isSelected ? style.active : style.idle
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 右側: アクション (詳細開閉 / 通常モードに戻る) */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800/60"
              aria-expanded={isExpanded}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>{isExpanded ? 'カード個別設定を閉じる' : 'カード個別設定'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <a
              href="./"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline shrink-0"
              title="通常モード（PAT入力画面）へ移動"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>通常モードへ</span>
            </a>
          </div>
        </div>

        {/* 展開時: 各カードごとの個別シミュレーションセレクタ */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Dynamic Feature Modules (Actions Usage, Runners, etc.) */}
            {features.map((feature) => {
              if (!feature.debugScenarios || feature.debugScenarios.length === 0) return null;
              const currentScenarioId = featureScenarioSelections[feature.id] || 'normal';
              const selectId = `debug-select-feature-${feature.id}`;
              const label =
                feature.id === 'actionsUsage'
                  ? '⚡ Actions Usage'
                  : feature.id === 'selfHostedRunners'
                  ? '🖥️ Self-hosted Runners'
                  : `🧩 ${feature.id}`;

              return (
                <div key={feature.id} className="flex flex-col gap-1">
                  <label htmlFor={selectId} className="text-slate-400 font-medium">
                    {label}
                  </label>
                  <select
                    id={selectId}
                    value={currentScenarioId}
                    onChange={(e) => onSelectFeatureScenario(feature.id, e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {feature.debugScenarios.map((scenario) => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}

            {/* Repositories (PR / CI) */}
            <div className="flex flex-col gap-1">
              <label htmlFor="debug-select-repos" className="text-slate-400 font-medium">
                📦 Repositories (PR / CI)
              </label>
              <select
                id="debug-select-repos"
                value={repositoriesScenarioId}
                onChange={(e) => onSelectRepositoriesScenario(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {REPOSITORIES_DEBUG_SCENARIOS.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rate Limit */}
            <div className="flex flex-col gap-1">
              <label htmlFor="debug-select-ratelimit" className="text-slate-400 font-medium">
                ⏱️ GitHub API Rate Limit
              </label>
              <select
                id="debug-select-ratelimit"
                value={rateLimitScenarioId}
                onChange={(e) => onSelectRateLimitScenario(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {RATE_LIMIT_DEBUG_SCENARIOS.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
