import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, FolderGit2, AlertCircle } from 'lucide-react';
import type {
  AppSettings,
  DashboardState,
  RepositoryDashboardData,
} from './types';
import { loadSettings, saveSettings, clearSettings, createDefaultSettings } from './services/storage';
import {
  fetchRepositoryPRs,
  getLatestRateLimit,
} from './services/githubApi';
import { Header } from './components/Header';
import { DashboardSummaryBar } from './components/DashboardSummaryBar';
import { RepositoriesCard } from './components/RepositoriesCard';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { dashboardFeatures, isFeatureEnabled } from './features/registry';
import type { FeatureDataState } from './features/types';
import {
  DEMO_SETTINGS,
  DEMO_PROJECTS,
} from './data/mockData';

const VIEW_MODE_STORAGE_KEY = 'dashboard_view_mode';

export function App() {
  const isDemoMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';

  const [settings, setSettings] = useState<AppSettings>(() => {
    if (isDemoMode) return DEMO_SETTINGS;
    return loadSettings();
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 表示モード（簡易 / 詳細）。デフォルトはスマホ・タブレット幅なら compact、PCなら expanded
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === 'compact' || saved === 'expanded') {
        return saved;
      }
      if (window.innerWidth < 768) {
        return 'compact';
      }
    }
    return 'expanded';
  });

  const handleToggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === 'compact' ? 'expanded' : 'compact';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
        } catch {
          // localStorage 使用不可時は何もしない
        }
      }
      return next;
    });
  };

  const [state, setState] = useState<DashboardState>(() => {
    if (isDemoMode) {
      return {
        isLoading: false,
        isRefreshing: false,
        lastRefreshedAt: new Date(),
        rateLimit: {
          remaining: 4892,
          limit: 5000,
          resetAt: new Date(Date.now() + 1000 * 60 * 45),
        },
        projects: DEMO_PROJECTS,
        error: null,
      };
    }
    return {
      isLoading: false,
      isRefreshing: false,
      lastRefreshedAt: null,
      rateLimit: null,
      projects: [],
      error: null,
    };
  });

  const [featureStates, setFeatureStates] = useState<Record<string, FeatureDataState>>(() => {
    if (!isDemoMode) return {};
    return Object.fromEntries(
      dashboardFeatures
        .filter((feature) => feature.demoData !== undefined)
        .map((feature) => [feature.id, { data: feature.demoData, error: null, isLoading: false }])
    );
  });
  const featureStatesRef = useRef(featureStates);
  useEffect(() => {
    featureStatesRef.current = featureStates;
  }, [featureStates]);

  // 初回アクセス（PAT 未設定）の判定（デモモード時はオンボーディング非表示）
  const needsOnboarding = !isDemoMode && !settings.pat;

  // データ取得関数
  const refreshData = useCallback(async (isSilent = false) => {
    if (isDemoMode) {
      if (!isSilent) {
        setState((prev) => ({ ...prev, isRefreshing: true }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, isRefreshing: false, lastRefreshedAt: new Date() }));
        }, 500);
      }
      return;
    }

    if (!settings.pat || !settings.username) return;

    if (!isSilent) {
      setState((prev) => ({ ...prev, isRefreshing: true }));
    }

    try {
      // 監視対象リポジトリの PR / CI 取得
      if (settings.repositories.length > 0) {
        const repoPromises = settings.repositories.map(async (repoFullName) => {
          const [owner, name] = repoFullName.split('/');
          if (!owner || !name) {
            return {
              owner: '',
              name: '',
              fullName: repoFullName,
              isPrivate: false,
              pullRequests: [],
              error: 'リポジトリ名が不正です (owner/repo 形式である必要があります)',
            } as RepositoryDashboardData;
          }
          return await fetchRepositoryPRs(settings.pat, owner, name);
        });

        const repoResults = await Promise.all(repoPromises);
        setState((prev) => ({ ...prev, projects: repoResults }));
      } else {
        setState((prev) => ({ ...prev, projects: [] }));
      }

      const enabledFeatures = dashboardFeatures.filter(
        (feature) => isFeatureEnabled(feature, settings.features)
      );
      const enabledFeatureIds = new Set(enabledFeatures.map((feature) => feature.id));
      setFeatureStates((previous) => {
        const next = { ...previous };
        for (const feature of dashboardFeatures) {
          if (!enabledFeatureIds.has(feature.id)) {
            delete next[feature.id];
          } else {
            next[feature.id] = {
              data: previous[feature.id]?.data ?? null,
              error: null,
              isLoading: true,
            };
          }
        }
        return next;
      });

      await Promise.all(
        enabledFeatures.map(async (feature) => {
          try {
            const data = await feature.loadData({
              pat: settings.pat,
              username: settings.username,
              repositories: settings.repositories,
              monitoredOrgs: settings.monitoredOrgs || [],
              settings: settings.features[feature.id] ?? {
                enabled: feature.alwaysEnabled ?? feature.defaultEnabled,
                options: {},
              },
              previousData: featureStatesRef.current[feature.id]?.data,
            });
            setFeatureStates((previous) => ({
              ...previous,
              [feature.id]: { data, error: null, isLoading: false },
            }));
          } catch (err: any) {
            console.warn(`Dashboard feature (${feature.id}) fetch failed:`, err);
            setFeatureStates((previous) => ({
              ...previous,
              [feature.id]: {
                data: previous[feature.id]?.data ?? null,
                error: err.message || '機能データの取得に失敗しました',
                isLoading: false,
              },
            }));
          }
        })
      );

      setState((prev) => ({
        ...prev,
        rateLimit: getLatestRateLimit(),
        lastRefreshedAt: new Date(),
        isRefreshing: false,
        error: null,
      }));
    } catch (err: any) {
      console.error('Refresh error:', err);
      setState((prev) => ({
        ...prev,
        isRefreshing: false,
        error: err.message || 'データの取得中にエラーが発生しました',
      }));
    }
  }, [
    settings.pat,
    settings.username,
    settings.repositories,
    settings.features,
    settings.monitoredOrgs,
  ]);

  // 設定変更または初回ロード時のデータ取得
  useEffect(() => {
    if (settings.pat && settings.username) {
      refreshData();
    }
  }, [
    settings.pat,
    settings.username,
    settings.repositories,
    settings.features,
    settings.monitoredOrgs,
    refreshData,
  ]);

  // 自動更新タイマーの設定
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (settings.refreshIntervalSec > 0 && settings.pat && !isDemoMode) {
      timerRef.current = window.setInterval(() => {
        refreshData(true);
      }, settings.refreshIntervalSec * 1000);
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [settings.refreshIntervalSec, settings.pat, isDemoMode, refreshData]);

  // オンボーディング完了ハンドラ
  const handleOnboardingComplete = (pat: string, username: string) => {
    const updated: AppSettings = {
      ...settings,
      pat,
      username,
    };
    saveSettings(updated);
    setSettings(updated);
  };

  // 設定保存ハンドラ
  const handleSaveSettings = (newSettings: AppSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);

    // 既存の projects も新しい順序に即座に並べ替えて即応性を高める
    setState((prev) => {
      const repoMap = new Map(prev.projects.map((p) => [p.fullName, p]));
      const reorderedProjects = newSettings.repositories
        .map((name) => repoMap.get(name))
        .filter((p): p is RepositoryDashboardData => Boolean(p));
      return { ...prev, projects: reorderedProjects };
    });
  };

  // ログアウト / リセットハンドラ
  const handleLogout = () => {
    if (window.confirm('ダッシュボードの設定とトークンを消去して初期化しますか？')) {
      clearSettings();
      setSettings({
        ...createDefaultSettings(),
      });
      setFeatureStates({});
      setState({
        isLoading: false,
        isRefreshing: false,
        lastRefreshedAt: null,
        rateLimit: null,
        projects: [],
        error: null,
      });
      setIsSettingsOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <Header
        username={settings.username}
        isRefreshing={state.isRefreshing}
        lastRefreshedAt={state.lastRefreshedAt}
        rateLimit={state.rateLimit}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onRefresh={() => refreshData()}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {isDemoMode && (
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              <span>
                <strong className="font-semibold text-indigo-200">デモモード表示中:</strong>{' '}
                サンプルデータで各機能をプレビューしています（実際の GitHub API 通信は行われません）。
              </span>
            </div>
            <a
              href="./"
              className="inline-flex items-center gap-1 font-medium text-indigo-400 hover:text-indigo-300 hover:underline shrink-0"
            >
              通常モード（PAT入力）へ戻る &rarr;
            </a>
          </div>
        )}

        {state.error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{state.error}</span>
          </div>
        )}

        {/* Dashboard Status Highlights */}
        <DashboardSummaryBar
          projects={state.projects}
          featureAlerts={dashboardFeatures.flatMap((feature) => {
            if (!isFeatureEnabled(feature, settings.features)) return [];
            const data = featureStates[feature.id]?.data;
            return data == null ? [] : (feature.getAlerts?.(data) ?? []);
          })}
        />

        {dashboardFeatures.map((feature) => {
          if (!isFeatureEnabled(feature, settings.features)) return null;
          const FeatureCard = feature.Card;
          return (
            <FeatureCard
              key={feature.id}
              state={featureStates[feature.id] ?? { data: null, error: null, isLoading: false }}
              isCompact={viewMode === 'compact'}
            />
          );
        })}

        {/* 3. Repositories Section (統一親カード) */}
        <RepositoriesCard
          repositories={settings.repositories}
          projects={state.projects}
          isCompact={viewMode === 'compact'}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <div className="flex items-center justify-center gap-2">
          <span>Personal Dev Dashboard</span>
          <a
            href="https://github.com/asabon/personal-dev-dashboard/releases"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-[11px] text-slate-400 hover:text-indigo-400 transition-colors"
          >
            v{__APP_VERSION__}
          </a>
          <span>•</span>
          <a
            href="https://github.com/asabon/personal-dev-dashboard"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-400 transition-colors"
          >
            GitHub
          </a>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onLogout={handleLogout}
      />

      {/* Onboarding Modal */}
      {needsOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}

export default App;
