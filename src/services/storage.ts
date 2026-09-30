import type { AppSettings } from '../types';
import { dashboardFeatures, createDefaultFeatureSettings } from '../features/registry';

const STORAGE_KEY = 'personal_dev_dashboard_settings';

export function createDefaultSettings(): AppSettings {
  return {
    pat: '',
    username: '',
    repositories: [],
    refreshIntervalSec: 60,
    features: createDefaultFeatureSettings(),
    monitoredOrgs: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSettings();
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return createDefaultSettings();

    const features = isRecord(parsed.features) ? { ...parsed.features } : {};
    const defaults = createDefaultFeatureSettings();
    for (const feature of dashboardFeatures) {
      const stored = features[feature.id];
      if (isRecord(stored)) {
        features[feature.id] = {
          enabled: typeof stored.enabled === 'boolean' ? stored.enabled : feature.defaultEnabled,
          options: isRecord(stored.options) ? stored.options : {},
        };
      } else {
        const legacyEnabled = feature.legacyEnabledSetting
          ? parsed[feature.legacyEnabledSetting]
          : undefined;
        features[feature.id] = {
          ...defaults[feature.id],
          enabled: typeof legacyEnabled === 'boolean' ? legacyEnabled : feature.defaultEnabled,
        };
      }
    }

    return {
      pat: typeof parsed.pat === 'string' ? parsed.pat : '',
      username: typeof parsed.username === 'string' ? parsed.username : '',
      repositories: Array.isArray(parsed.repositories) ? parsed.repositories : [],
      refreshIntervalSec: typeof parsed.refreshIntervalSec === 'number' ? parsed.refreshIntervalSec : 60,
      features: features as AppSettings['features'],
      monitoredOrgs: Array.isArray(parsed.monitoredOrgs) ? parsed.monitoredOrgs : [],
    };
  } catch (err) {
    console.error('Failed to parse settings from localStorage:', err);
    return createDefaultSettings();
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
