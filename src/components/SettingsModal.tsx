import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  KeyRound,
  Plus,
  Trash2,
  AlertCircle,
  LogOut,
  FolderGit2,
  Clock,
  CheckCircle2,
  Search,
  Lock,
  Globe,
  RefreshCw,
  Check,
  Star,
} from 'lucide-react';
import type { AppSettings, UserRepositoryOption } from '../types';
import { validateToken, fetchUserRepositories } from '../services/githubApi';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
  onLogout,
}) => {
  const [pat, setPat] = useState(settings.pat);
  const [repositories, setRepositories] = useState<string[]>(settings.repositories);
  const [newRepoInput, setNewRepoInput] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(settings.refreshIntervalSec);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // マイリポジトリ一覧用 State
  const [addMode, setAddMode] = useState<'select' | 'manual'>('select');
  const [userRepos, setUserRepos] = useState<UserRepositoryOption[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'private' | 'public'>('all');

  const loadUserRepos = useCallback(async (force = false) => {
    if (!pat.trim()) return;
    setIsLoadingRepos(true);
    setReposError(null);
    try {
      const repos = await fetchUserRepositories(pat.trim(), force);
      setUserRepos(repos);
    } catch (err: any) {
      setReposError(err.message || 'リポジトリ一覧の取得に失敗しました');
    } finally {
      setIsLoadingRepos(false);
    }
  }, [pat]);

  // モーダルが開かれたとき、または PAT が有効な状態で初回表示時にリポジトリ一覧を読み込む
  useEffect(() => {
    if (isOpen && pat.trim()) {
      loadUserRepos();
    }
  }, [isOpen, loadUserRepos, pat]);

  if (!isOpen) return null;

  const handleToggleRepo = (fullName: string) => {
    if (repositories.includes(fullName)) {
      setRepositories(repositories.filter((r) => r !== fullName));
    } else {
      setRepositories([...repositories, fullName]);
    }
  };

  const handleAddManualRepo = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newRepoInput.trim();
    if (!clean) return;

    // "owner/name" の形式かバリデーション
    const parts = clean.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError('リポジトリ名は "owner/repo" の形式で入力してください。');
      return;
    }

    if (repositories.includes(clean)) {
      setError('そのリポジトリは既に追加されています。');
      return;
    }

    setRepositories([...repositories, clean]);
    setNewRepoInput('');
    setError(null);
  };

  const handleRemoveRepo = (target: string) => {
    setRepositories(repositories.filter((r) => r !== target));
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsValidating(true);

    try {
      let username = settings.username;
      // トークンが変更された場合は検証
      if (pat.trim() !== settings.pat) {
        const userInfo = await validateToken(pat);
        username = userInfo.username;
      }

      const updated: AppSettings = {
        pat: pat.trim(),
        username,
        repositories,
        refreshIntervalSec: refreshInterval,
      };

      onSave(updated);
      setSuccessMessage('設定を保存しました');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'トークンの検証に失敗しました');
    } finally {
      setIsValidating(false);
    }
  };

  // フィルタリングされたユーザーリポジトリ
  const filteredRepos = userRepos.filter((repo) => {
    // 検索語句マッチ
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = repo.fullName.toLowerCase().includes(q);
      const matchDesc = repo.description?.toLowerCase().includes(q) || false;
      if (!matchName && !matchDesc) return false;
    }
    // 種別フィルター
    if (filterType === 'private' && !repo.isPrivate) return false;
    if (filterType === 'public' && repo.isPrivate) return false;

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100">ダッシュボード設定</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. GitHub Token Section */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              GitHub Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder="ghp_xxxx または github_pat_xxxx"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-xs"
            />
            <p className="text-[11px] text-slate-400">
              ※ トークンはブラウザの localStorage にのみ保存され、外部サーバーには送信されません。
            </p>
          </div>

          {/* 2. Repository Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                監視対象リポジトリ
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-normal">
                  {repositories.length}件 選択中
                </span>
              </label>

              {/* タブ切り替えボタン */}
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAddMode('select')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                    addMode === 'select'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  マイリポジトリから選ぶ
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('manual')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                    addMode === 'manual'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  手動入力
                </button>
              </div>
            </div>

            {/* モード1: マイリポジトリから選択 */}
            {addMode === 'select' && (
              <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
                {/* 検索・フィルター・再取得ヘッダー */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="リポジトリを検索..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  {/* 種別フィルター */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                        filterType === 'all'
                          ? 'bg-slate-700 text-slate-100 font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      すべて
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('private')}
                      className={`px-2 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
                        filterType === 'private'
                          ? 'bg-slate-700 text-slate-100 font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Lock className="w-2.5 h-2.5 text-amber-400" />
                      Private
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('public')}
                      className={`px-2 py-1 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
                        filterType === 'public'
                          ? 'bg-slate-700 text-slate-100 font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Globe className="w-2.5 h-2.5 text-blue-400" />
                      Public
                    </button>
                  </div>

                  {/* リフレッシュボタン */}
                  <button
                    type="button"
                    onClick={() => loadUserRepos(true)}
                    disabled={isLoadingRepos}
                    title="リポジトリ一覧を再読み込み"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRepos ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* エラー表示 */}
                {reposError && (
                  <p className="text-xs text-rose-400 py-1">{reposError}</p>
                )}

                {/* リスト表示領域 */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                  {isLoadingRepos ? (
                    <div className="flex items-center justify-center py-8 text-xs text-slate-400 gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                      <span>アクセス可能なリポジトリを読み込み中...</span>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {userRepos.length === 0
                        ? 'アクセス可能なリポジトリが見つかりませんでした。トークンの権限をご確認ください。'
                        : '条件に一致するリポジトリがありません。'}
                    </div>
                  ) : (
                    filteredRepos.map((repo) => {
                      const isSelected = repositories.includes(repo.fullName);
                      return (
                        <div
                          key={repo.fullName}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-indigo-950/30 border-indigo-500/40'
                              : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1 mr-3">
                            <div className="flex items-center gap-1.5">
                              {repo.isPrivate ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  <Lock className="w-2.5 h-2.5" />
                                  Private
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  <Globe className="w-2.5 h-2.5" />
                                  Public
                                </span>
                              )}
                              <span className="font-mono text-xs font-medium text-slate-200 truncate">
                                {repo.fullName}
                              </span>
                              {repo.stargazersCount > 0 && (
                                <span className="flex items-center gap-0.5 text-[10px] text-slate-400 ml-1">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  {repo.stargazersCount}
                                </span>
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {repo.description}
                              </p>
                            )}
                          </div>

                          {/* ワンクリックトグルボタン */}
                          <button
                            type="button"
                            onClick={() => handleToggleRepo(repo.fullName)}
                            className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/20 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/30 group'
                                : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700/80 hover:border-indigo-500'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400 group-hover:hidden" />
                                <Trash2 className="w-3 h-3 text-rose-400 hidden group-hover:inline" />
                                <span className="group-hover:hidden">選択中</span>
                                <span className="hidden group-hover:inline">解除</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>追加</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* モード2: 手動入力 */}
            {addMode === 'manual' && (
              <form onSubmit={handleAddManualRepo} className="flex gap-2">
                <input
                  type="text"
                  value={newRepoInput}
                  onChange={(e) => setNewRepoInput(e.target.value)}
                  placeholder="例: facebook/react, vercel/next.js"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  <Plus className="w-3.5 h-3.5" /> 追加
                </button>
              </form>
            )}

            {/* 現在登録されているリポジトリ一覧 */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-medium">現在登録中のリポジトリ:</span>
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
                {repositories.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">監視対象のリポジトリがありません</p>
                ) : (
                  repositories.map((repo) => (
                    <div
                      key={repo}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-mono text-slate-200"
                    >
                      <span className="truncate mr-2">{repo}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRepo(repo)}
                        title="監視対象から削除"
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 3. Auto Refresh Interval */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              自動更新間隔
            </label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 focus:outline-none focus:border-indigo-500 text-xs"
            >
              <option value={0}>自動更新なし（手動更新のみ）</option>
              <option value={30}>30秒ごと</option>
              <option value={60}>1分ごと（推奨）</option>
              <option value={300}>5分ごと</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>トークンを削除して初期化</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isValidating}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {isValidating ? '検証中...' : '保存する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
