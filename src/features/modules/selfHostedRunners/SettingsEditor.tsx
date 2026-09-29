import React, { useEffect, useState } from 'react';
import { Building2, Cpu } from 'lucide-react';
import { fetchUserOrganizations } from '../../../services/githubApi';
import type { FeatureSettingsEditorProps } from '../../types';

export const SelfHostedRunnersSettingsEditor: React.FC<FeatureSettingsEditorProps> = ({
  settings,
  pat,
  monitoredOrgs,
  onChange,
  onMonitoredOrgsChange,
}) => {
  const [availableOrgs, setAvailableOrgs] = useState<string[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  useEffect(() => {
    if (!settings.enabled || !pat.trim()) return;

    let isCurrent = true;
    setIsLoadingOrgs(true);
    fetchUserOrganizations(pat.trim())
      .then((orgs) => {
        if (!isCurrent) return;
        setAvailableOrgs(orgs);
        if (monitoredOrgs.length === 0 && orgs.length > 0) {
          onMonitoredOrgsChange(orgs);
        }
      })
      .catch((error) => {
        console.warn('Failed to load user orgs:', error);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingOrgs(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [settings.enabled, pat]);

  const toggleOrg = (org: string) => {
    onMonitoredOrgsChange(
      monitoredOrgs.includes(org)
        ? monitoredOrgs.filter((item) => item !== org)
        : [...monitoredOrgs, org]
    );
  };

  return (
    <section className="space-y-3 pt-2 border-t border-slate-800">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          Self-hosted Runners の稼働状況を表示
        </label>
        <button
          type="button"
          role="switch"
          aria-checked={settings.enabled}
          aria-label="Self-hosted Runners の稼働状況を表示"
          onClick={() => onChange({ ...settings, enabled: !settings.enabled })}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            settings.enabled ? 'bg-indigo-600' : 'bg-slate-800'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              settings.enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        自宅マシンや自前サーバーの Online / Offline 状態を表示します。リポジトリ専用ランナーには <code className="text-slate-300">repo</code>、Org 共有ランナーには <code className="text-slate-300">admin:org</code> スコープが必要です。
      </p>

      {settings.enabled && (
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            共有ランナーを監視する Organization:
          </span>
          {isLoadingOrgs ? (
            <p className="text-[11px] text-slate-400">所属 Organization を取得中...</p>
          ) : availableOrgs.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              所属 Organization は見つかりませんでした。リポジトリ専用ランナーのみ監視します。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {availableOrgs.map((org) => {
                const isChecked = monitoredOrgs.includes(org);
                return (
                  <button
                    key={org}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => toggleOrg(org)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span>{isChecked ? '✓' : '+'}</span>
                    <span>{org}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};