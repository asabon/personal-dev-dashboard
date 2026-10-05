import type { ComponentType, ReactNode } from 'react';
import type { FeatureSettings, SelfHostedRunner } from '../types';

export interface FeatureSettingsEditorProps {
  settings: FeatureSettings;
  pat: string;
  monitoredOrgs: string[];
  onChange: (settings: FeatureSettings) => void;
  onMonitoredOrgsChange: (orgs: string[]) => void;
}

export interface FeatureLoadContext {
  pat: string;
  username: string;
  repositories: string[];
  monitoredOrgs: string[];
  settings: FeatureSettings;
  previousData?: unknown;
}

export interface FeatureDataState {
  data: unknown | null;
  error: string | null;
  isLoading: boolean;
}

export interface FeatureCardProps {
  state: FeatureDataState;
  isCompact: boolean;
}

export interface FeatureAlert {
  id: string;
  label: string;
  targetId: string;
  icon: ReactNode;
  tone: 'warning' | 'danger';
}

export interface FeatureDebugScenario {
  id: string;
  label: string;
  category?: string;
  state: FeatureDataState;
}

export interface DashboardFeatureDefinition {
  id: string;
  defaultEnabled: boolean;
  alwaysEnabled?: boolean;
  legacyEnabledSetting?: string;
  SettingsEditor?: ComponentType<FeatureSettingsEditorProps>;
  Card: ComponentType<FeatureCardProps>;
  loadData: (context: FeatureLoadContext) => Promise<unknown>;
  getAlerts?: (data: unknown) => FeatureAlert[];
  demoData?: unknown;
  debugScenarios?: FeatureDebugScenario[];
}