import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, saveSettings, clearSettings } from './storage';
import type { AppSettings } from '../types';
import { SELF_HOSTED_RUNNERS_FEATURE_ID } from '../features/ids';

describe('storage service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('初期状態（localStorageが空）でデフォルト設定を返すこと', () => {
    const settings = loadSettings();
    expect(settings).toEqual({
      pat: '',
      username: '',
      repositories: [],
      refreshIntervalSec: 60,
      features: {
        actionsUsage: { enabled: true, options: {} },
        [SELF_HOSTED_RUNNERS_FEATURE_ID]: { enabled: false, options: {} },
      },
      monitoredOrgs: [],
    });
  });

  it('保存した設定が正しく読み出せること', () => {
    const customSettings: AppSettings = {
      pat: 'ghp_test123456789',
      username: 'octocat',
      repositories: ['owner/repo-a', 'owner/repo-b'],
      refreshIntervalSec: 300,
      features: {
        actionsUsage: { enabled: true, options: {} },
        [SELF_HOSTED_RUNNERS_FEATURE_ID]: { enabled: true, options: {} },
      },
      monitoredOrgs: ['my-org'],
    };

    saveSettings(customSettings);
    const loaded = loadSettings();
    expect(loaded).toEqual(customSettings);
  });

  it('従来の Self-hosted Runner 設定を feature 設定へ移行すること', () => {
    localStorage.setItem(
      'personal_dev_dashboard_settings',
      JSON.stringify({ showSelfHostedRunners: true, monitoredOrgs: ['old-org'] })
    );

    const loaded = loadSettings();
    expect(loaded.features[SELF_HOSTED_RUNNERS_FEATURE_ID].enabled).toBe(true);
    expect(loaded.monitoredOrgs).toEqual(['old-org']);
  });

  it('localStorage の JSON が破損している場合でもクラッシュせずデフォルト設定を返すこと', () => {
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('personal_dev_dashboard_settings', 'invalid-json-{{{');

    const loaded = loadSettings();
    expect(loaded.refreshIntervalSec).toBe(60);
    expect(loaded.repositories).toEqual([]);
    expect(spyError).toHaveBeenCalled();
  });

  it('clearSettings で localStorage の設定が削除されること', () => {
    saveSettings({
      pat: 'ghp_secret',
      username: 'user',
      repositories: ['a/b'],
      refreshIntervalSec: 60,
      features: { [SELF_HOSTED_RUNNERS_FEATURE_ID]: { enabled: false, options: {} } },
      monitoredOrgs: [],
    });

    clearSettings();
    expect(loadSettings().pat).toBe('');
  });
});
