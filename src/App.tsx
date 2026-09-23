import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Plus, FolderGit2, AlertCircle } from 'lucide-react';
import type {
  AppSettings,
  DashboardState,
  RepositoryDashboardData,
  ActionsUsageAccount,
  ActionsUsageItem,
} from './types';
import { loadSettings, saveSettings, clearSettings } from './services/storage';
import {
  fetchActionsUsage,
  fetchOrgActionsUsage,
  fetchUserOrganizations,
  fetchRepositoryPRs,
  fetchAllSelfHostedRunners,
  getLatestRateLimit,
} from './services/githubApi';
import { Header } from './components/Header';
import { DashboardSummaryBar } from './components/DashboardSummaryBar';
import { ActionsUsageCard } from './components/ActionsUsageCard';
import { RepositoriesCard } from './components/RepositoriesCard';
import { RunnersCard } from './components/RunnersCard';
import { SettingsModal } from './components/SettingsModal';
import { OnboardingModal } from './components/OnboardingModal';
import {
  DEMO_SETTINGS,
  DEMO_USAGE,
  DEMO_ORG_USAGE,
  DEMO_USAGE_MAP,
  DEMO_PROJECTS,
  DEMO_RUNNERS,
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

  const [selectedUsageAccount, setSelectedUsageAccount] = useState<string>(() => {
    if (isDemoMode) return 'demo-developer';
    return settings.username || '';
  });
  const [discoveredOrgs, setDiscoveredOrgs] = useState<string[]>([]);

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
        usage: DEMO_USAGE,
        usageMap: DEMO_USAGE_MAP,
        selectedUsageAccount: 'demo-developer',
        projects: DEMO_PROJECTS,
        runners: DEMO_RUNNERS,
        isLoadingRunners: false,
        runnersError: null,
        error: null,
      };
    }
    return {
      isLoading: false,
      isRefreshing: false,
      lastRefreshedAt: null,
      rateLimit: null,
      usage: null,
      usageMap: {},
      selectedUsageAccount: settings.username || '',
      projects: [],
      runners: [],
      isLoadingRunners: false,
      runnersError: null,
      error: null,
    };
  });

  const [actionsError, setActionsError] = useState<string | null>(null);

  // 利用可能なアカウント（個人 + 所属/監視対象 Organization）一覧の算出
  const accounts: ActionsUsageAccount[] = useMemo(() => {
    if (isDemoMode) {
      return [
        { name: 'demo-developer', type: 'user' },
        { name: 'demo-org', type: 'org' },
      ];
    }
    const list: ActionsUsageAccount[] = [];
    if (settings.username) {
      list.push({ name: settings.username, type: 'user' });
    }
    const orgs = Array.from(
      new Set([...(settings.monitoredOrgs || []), ...discoveredOrgs])
    ).filter((o) => o && o !== settings.username);

    for (const org of orgs) {
      list.push({ name: org, type: 'org' });
    }
    return list;
  }, [isDemoMode, settings.username, settings.monitoredOrgs, discoveredOrgs]);

  // アカウント選択の自動同期
  useEffect(() => {
    if (!selectedUsageAccount && settings.username) {
      setSelectedUsageAccount(settings.username);
    }
  }, [selectedUsageAccount, settings.username]);

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

    setActionsError(null);

    try {
      // 1. Actions 使用量の取得 (ユーザー個人 + Org)
      const newUsageMap: Record<string, ActionsUsageItem> = {};

      // 1-1. ユーザー個人の使用量取得
      try {
        const usageData = await fetchActionsUsage(settings.pat, settings.username);
        newUsageMap[settings.username] = { usage: usageData, error: null };
      } catch (err: any) {
        console.warn('Actions usage fetch failed:', err);
        const errMsg = err.message || 'Actions 使用量の取得に失敗しました';
        newUsageMap[settings.username] = { usage: null, error: errMsg };
        setActionsError(errMsg);
      }

      // 1-2. 所属 Org の取得（未取得の場合）
      let currentOrgs = Array.from(
        new Set([...(settings.monitoredOrgs || []), ...discoveredOrgs])
      ).filter(Boolean);

      if (currentOrgs.length === 0) {
        try {
          const orgs = await fetchUserOrganizations(settings.pat);
          if (orgs.length > 0) {
            setDiscoveredOrgs(orgs);
            currentOrgs = orgs;
          }
        } catch (err) {
          console.warn('Failed to discover user orgs:', err);
        }
      }

      // 1-3. 各 Organization の使用量取得 (並行処理)
      if (currentOrgs.length > 0) {
        await Promise.allSettled(
          currentOrgs.map(async (org) => {
            try {
              const orgUsage = await fetchOrgActionsUsage(settings.pat, org);
              newUsageMap[org] = { usage: orgUsage, error: null };
            } catch (err: any) {
              console.warn(`Org (${org}) actions usage fetch failed:`, err);
              newUsageMap[org] = {
                usage: null,
                error: err.message || 'Organization の使用量取得に失敗しました',
              };
            }
          })
        );
      }

      setState((prev) => {
        const updatedMap = { ...(prev.usageMap || {}), ...newUsageMap };
        const activeAcc = selectedUsageAccount || settings.username;
        return {
          ...prev,
          usageMap: updatedMap,
          usage: updatedMap[activeAcc]?.usage ?? updatedMap[settings.username]?.usage ?? null,
        };
      });

      // 2. 監視対象リポジトリの PR / CI 取得
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

      // 3. セルフホステッドランナーの取得（設定が有効な場合のみ）
      if (settings.showSelfHostedRunners) {
        setState((prev) => ({ ...prev, isLoadingRunners: true, runnersError: null }));
        try {
          const { runners: runnersData, warning } = await fetchAllSelfHostedRunners(
            settings.pat,
            settings.repositories,
            settings.monitoredOrgs || [],
            settings.username
          );
          setState((prev) => ({
            ...prev,
            runners: runnersData,
            isLoadingRunners: false,
            runnersError: warning || null,
          }));
        } catch (err: any) {
          console.warn('Runners fetch failed:', err);
          setState((prev) => ({
            ...prev,
            isLoadingRunners: false,
            runnersError: err.message || 'ランナー情報の取得に失敗しました',
          }));
        }
      } else {
        setState((prev) => ({ ...prev, runners: [], isLoadingRunners: false, runnersError: null }));
      }

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
    settings.showSelfHostedRunners,
    settings.monitoredOrgs,
    discoveredOrgs,
    selectedUsageAccount,
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
    settings.showSelfHostedRunners,
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
    setSelectedUsageAccount(username);
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
      setSelectedUsageAccount('');
      setDiscoveredOrgs([]);
      setSettings({
        pat: '',
        username: '',
        repositories: [],
        refreshIntervalSec: 60,
        showSelfHostedRunners: false,
      });
      setState({
        isLoading: false,
        isRefreshing: false,
        lastRefreshedAt: null,
        rateLimit: null,
        usage: null,
        projects: [],
        runners: [],
        isLoadingRunners: false,
        runnersError: null,
        error: null,
      });
      setIsSettingsOpen(false);
    }
  };

  // リポジトリ個別削除ハンドラ
  const handleRemoveRepo = (targetFullName: string) => {
    const updatedRepos = settings.repositories.filter((r) => r !== targetFullName);
    const updated: AppSettings = { ...settings, repositories: updatedRepos };
    saveSettings(updated);
    setSettings(updated);
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
        {(() => {
          const allUsages = accounts.map((acc) => {
            const item = state.usageMap?.[acc.name];
            return item ? item.usage : (acc.name === settings.username ? state.usage : null);
          });

          return (
            <DashboardSummaryBar
              projects={state.projects}
              usages={allUsages}
              runners={state.runners}
              showRunners={Boolean(settings.showSelfHostedRunners)}
            />
          );
        })()}

        {/* 1. Actions Usage Summary (全アカウント常時並列表示) */}
        <ActionsUsageCard
          accounts={accounts}
          usageMap={state.usageMap}
          isLoading={state.isRefreshing}
          isCompact={viewMode === 'compact'}
          usage={state.usage}
          error={actionsError}
        />

        {/* 2. Self-hosted Runners Panel (設定で有効時のみ表示) */}
        {settings.showSelfHostedRunners && (
          <RunnersCard
            runners={state.runners}
            isLoading={state.isLoadingRunners}
            error={state.runnersError}
            isCompact={viewMode === 'compact'}
          />
        )}

        {/* 3. Repositories Section (統一親カード) */}
        <RepositoriesCard
          repositories={settings.repositories}
          projects={state.projects}
          isCompact={viewMode === 'compact'}
          onAddRepo={() => setIsSettingsOpen(true)}
          onRemoveRepo={handleRemoveRepo}
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
