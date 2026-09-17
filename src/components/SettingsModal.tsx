import React, { useState } from 'react';
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
} from 'lucide-react';
import type { AppSettings } from '../types';
import { validateToken } from '../services/githubApi';

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

  if (!isOpen) return null;

  const handleAddRepo = (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
              監視対象リポジトリ
            </label>

            <form onSubmit={handleAddRepo} className="flex gap-2">
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

            {/* List */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/40 p-2">
              {repositories.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">監視対象のリポジトリがありません</p>
              ) : (
                repositories.map((repo) => (
                  <div
                    key={repo}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs font-mono text-slate-200"
                  >
                    <span>{repo}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRepo(repo)}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
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
