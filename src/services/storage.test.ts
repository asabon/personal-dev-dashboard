import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, saveSettings, clearSettings } from './storage';
import type { AppSettings } from '../types';
import {
  SELF_HOSTED_RUNNERS_FEATURE_ID,
  WORKFLOW_RUNS_FEATURE_ID,
} from '../features/ids';

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
        [WORKFLOW_RUNS_FEATURE_ID]: { enabled: true, options: {} },
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
        [WORKFLOW_RUNS_FEATURE_ID]: { enabled: true, options: {} },
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

  it('保存済み設定に新しい feature ID が存在しない場合、デフォルト値で補完されること', () => {
    localStorage.setItem(
      'personal_dev_dashboard_settings',
      JSON.stringify({
        pat: 'ghp_existing',
        username: 'octocat',
        repositories: ['octocat/hello-world'],
        refreshIntervalSec: 120,
        features: {
          actionsUsage: { enabled: false, options: {} },
          [SELF_HOSTED_RUNNERS_FEATURE_ID]: { enabled: true, options: {} },
        },
        monitoredOrgs: [],
      })
    );

    const loaded = loadSettings();
    expect(loaded.features[WORKFLOW_RUNS_FEATURE_ID]).toEqual({
      enabled: true,
      options: {},
    });
    expect(loaded.features.actionsUsage.enabled).toBe(false);
    expect(loaded.features[SELF_HOSTED_RUNNERS_FEATURE_ID].enabled).toBe(true);
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
