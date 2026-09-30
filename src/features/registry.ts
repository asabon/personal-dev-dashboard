import type { FeatureSettings } from '../types';
import type { DashboardFeatureDefinition } from './types';

const featureModules = import.meta.glob<DashboardFeatureDefinition>(
  './modules/*/feature.tsx',
  { eager: true, import: 'feature' }
);

export const dashboardFeatures = Object.values(featureModules).sort((left, right) =>
  left.id.localeCompare(right.id)
);

export function createDefaultFeatureSettings(): Record<string, FeatureSettings> {
  return Object.fromEntries(
    dashboardFeatures.map((feature) => [
      feature.id,
      { enabled: feature.alwaysEnabled ?? feature.defaultEnabled, options: {} },
    ])
  );
}

export function isFeatureEnabled(
  feature: DashboardFeatureDefinition,
  settings: Record<string, FeatureSettings>
): boolean {
  return feature.alwaysEnabled ?? (settings[feature.id]?.enabled ?? feature.defaultEnabled);
}