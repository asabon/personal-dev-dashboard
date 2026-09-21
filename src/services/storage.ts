import type { AppSettings } from '../types';

const STORAGE_KEY = 'personal_dev_dashboard_settings';

const DEFAULT_SETTINGS: AppSettings = {
  pat: '',
  username: '',
  repositories: [],
  refreshIntervalSec: 60, // デフォルト1分更新
  showSelfHostedRunners: false, // デフォルトは無効（非表示）
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      pat: parsed.pat || '',
      username: parsed.username || '',
      repositories: Array.isArray(parsed.repositories) ? parsed.repositories : [],
      refreshIntervalSec: typeof parsed.refreshIntervalSec === 'number' ? parsed.refreshIntervalSec : 60,
      showSelfHostedRunners: Boolean(parsed.showSelfHostedRunners),
    };
  } catch (err) {
    console.error('Failed to parse settings from localStorage:', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings to localStorage:', err);
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear settings from localStorage:', err);
  }
}
