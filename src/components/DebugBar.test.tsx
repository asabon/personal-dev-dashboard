import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DebugBar } from './DebugBar';
import type { DashboardFeatureDefinition } from '../features/types';
import { OVERALL_DEBUG_PRESETS } from '../data/coreDebugScenarios';

const mockFeature: DashboardFeatureDefinition = {
  id: 'actionsUsage',
  defaultEnabled: true,
  alwaysEnabled: true,
  Card: () => <div data-testid="card">Card</div>,
  loadData: vi.fn(),
  debugScenarios: [
    {
      id: 'normal',
      label: '通常・余裕 (28%)',
      state: { data: null, error: null, isLoading: false },
    },
    {
      id: 'critical',
      label: '上限到達 (100%)',
      state: { data: null, error: null, isLoading: false },
    },
  ],
};

describe('DebugBar', () => {
  it('デバッグバーとプリセットボタンが表示され、プリセットクリック時に onSelectPreset が呼ばれること', () => {
    const onSelectPreset = vi.fn();
    const onSelectFeatureScenario = vi.fn();
    const onSelectRepositoriesScenario = vi.fn();
    const onSelectRateLimitScenario = vi.fn();

    render(
      <DebugBar
        features={[mockFeature]}
        selectedPresetId="healthy"
        featureScenarioSelections={{ actionsUsage: 'normal' }}
        repositoriesScenarioId="normal"
        rateLimitScenarioId="healthy"
        onSelectPreset={onSelectPreset}
        onSelectFeatureScenario={onSelectFeatureScenario}
        onSelectRepositoriesScenario={onSelectRepositoriesScenario}
        onSelectRateLimitScenario={onSelectRateLimitScenario}
      />
    );

    expect(screen.getByText('DEBUG MODE')).toBeInTheDocument();

    const criticalPresetButton = screen.getByRole('button', { name: '障害・枯渇 (Critical)' });
    expect(criticalPresetButton).toBeInTheDocument();
    fireEvent.click(criticalPresetButton);

    expect(onSelectPreset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'critical' })
    );
  });

  it('カード個別セレクタの変更時にハンドラが呼ばれること', () => {
    const onSelectPreset = vi.fn();
    const onSelectFeatureScenario = vi.fn();
    const onSelectRepositoriesScenario = vi.fn();
    const onSelectRateLimitScenario = vi.fn();

    render(
      <DebugBar
        features={[mockFeature]}
        selectedPresetId="healthy"
        featureScenarioSelections={{ actionsUsage: 'normal' }}
        repositoriesScenarioId="normal"
        rateLimitScenarioId="healthy"
        onSelectPreset={onSelectPreset}
        onSelectFeatureScenario={onSelectFeatureScenario}
        onSelectRepositoriesScenario={onSelectRepositoriesScenario}
        onSelectRateLimitScenario={onSelectRateLimitScenario}
      />
    );

    const featureSelect = screen.getByLabelText(/Actions Usage/i);
    fireEvent.change(featureSelect, { target: { value: 'critical' } });
    expect(onSelectFeatureScenario).toHaveBeenCalledWith('actionsUsage', 'critical');

    const repoSelect = screen.getByLabelText(/Repositories/i);
    fireEvent.change(repoSelect, { target: { value: 'empty' } });
    expect(onSelectRepositoriesScenario).toHaveBeenCalledWith('empty');

    const rateLimitSelect = screen.getByLabelText(/Rate Limit/i);
    fireEvent.change(rateLimitSelect, { target: { value: 'exhausted' } });
    expect(onSelectRateLimitScenario).toHaveBeenCalledWith('exhausted');
  });

  it('個別設定の開閉トグルをクリックすると開閉状態が切り替わること', () => {
    render(
      <DebugBar
        features={[mockFeature]}
        selectedPresetId="healthy"
        featureScenarioSelections={{ actionsUsage: 'normal' }}
        repositoriesScenarioId="normal"
        rateLimitScenarioId="healthy"
        onSelectPreset={vi.fn()}
        onSelectFeatureScenario={vi.fn()}
        onSelectRepositoriesScenario={vi.fn()}
        onSelectRateLimitScenario={vi.fn()}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /カード個別設定を閉じる/i });
    expect(screen.getByLabelText(/Repositories/i)).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.queryByLabelText(/Repositories/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /カード個別設定/i })).toBeInTheDocument();
  });
});
