import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadSettings, saveSettings, clearSettings } from './storage';
import type { AppSettings } from '../types';

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
      showSelfHostedRunners: false,
      monitoredOrgs: [],
    });
  });

  it('保存した設定が正しく読み出せること', () => {
    const customSettings: AppSettings = {
      pat: 'ghp_test123456789',
      username: 'octocat',
      repositories: ['owner/repo-a', 'owner/repo-b'],
      refreshIntervalSec: 300,
      showSelfHostedRunners: true,
      monitoredOrgs: ['my-org'],
    };

    saveSettings(customSettings);
    const loaded = loadSettings();
    expect(loaded).toEqual(customSettings);
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
      showSelfHostedRunners: false,
      monitoredOrgs: [],
    });

    clearSettings();
    expect(loadSettings().pat).toBe('');
  });
});
