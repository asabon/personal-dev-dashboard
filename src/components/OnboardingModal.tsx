import React, { useState } from 'react';
import { ShieldCheck, KeyRound, ExternalLink, Activity, AlertCircle, ArrowRight } from 'lucide-react';
import { validateToken } from '../services/githubApi';

interface OnboardingModalProps {
  onComplete: (pat: string, username: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setError('トークンを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { username } = await validateToken(token);
      onComplete(token, username);
    } catch (err: any) {
      setError(err.message || 'トークンの検証に失敗しました。正しいトークンか確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Personal Dev Dashboard へようこそ</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            GitHub Actions の無料枠使用量と複数リポジトリの PR / CI 状況を 1 画面で統合管理します。
          </p>
        </div>

        {/* Security Highlight */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>完全クライアント完結 (Zero-Backend)</span>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            入力されたトークンはブラウザの <code className="text-slate-300">localStorage</code> にのみ保存され、外部サーバーへ送信されることは一切ありません。通信はブラウザから直接 GitHub 公式 API と行われます。
          </p>
        </div>

        {/* Token Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                Personal Access Token (PAT)
              </label>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,user&description=Personal%20Dev%20Dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <span>トークンを新規作成</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxx または github_pat_xxxx"
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono text-xs shadow-inner"
            />
            <p className="text-[11px] text-slate-500">
              ※ <span className="text-slate-400 font-mono">repo</span> (PR & CI取得) および <span className="text-slate-400 font-mono">user</span> (Actions使用量取得) スコープが必要です（Classic PAT 推奨）。
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <span>検証中...</span>
            ) : (
              <>
                <span>ダッシュボードを開始</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Version */}
        <div className="text-center pt-1 border-t border-slate-800/60">
          <span className="font-mono text-[10px] text-slate-500">
            Personal Dev Dashboard v{__APP_VERSION__}
          </span>
        </div>
      </div>
    </div>
  );
};
