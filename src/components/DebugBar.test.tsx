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
      category: '正常・利用状況',
      label: '通常・余裕 (28%)',
      state: { data: null, error: null, isLoading: false },
    },
    {
      id: 'critical',
      category: '正常・利用状況',
      label: '上限到達 (100%)',
      state: { data: null, error: null, isLoading: false },
    },
    {
      id: 'error',
      category: '異常・エラー',
      label: 'API エラー (403)',
      state: { data: null, error: 'error', isLoading: false },
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

  it('カード個別セレクタの詳細状態の変更時にハンドラが呼ばれること', () => {
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

    const featureDetailSelect = screen.getByLabelText(/Actions Usage の詳細状態/i);
    fireEvent.change(featureDetailSelect, { target: { value: 'critical' } });
    expect(onSelectFeatureScenario).toHaveBeenCalledWith('actionsUsage', 'critical');

    const repoDetailSelect = screen.getByLabelText(/Repositories.*の詳細状態/i);
    fireEvent.change(repoDetailSelect, { target: { value: 'critical' } });
    expect(onSelectRepositoriesScenario).toHaveBeenCalledWith('critical');

    const rateLimitDetailSelect = screen.getByLabelText(/Rate Limit.*の詳細状態/i);
    fireEvent.change(rateLimitDetailSelect, { target: { value: 'exhausted' } });
    expect(onSelectRateLimitScenario).toHaveBeenCalledWith('exhausted');
  });

  it('状態種別（大分類）を切り替えると、そのカテゴリの先頭シナリオが自動選択されること', () => {
    const onSelectFeatureScenario = vi.fn();

    render(
      <DebugBar
        features={[mockFeature]}
        selectedPresetId="healthy"
        featureScenarioSelections={{ actionsUsage: 'normal' }}
        repositoriesScenarioId="normal"
        rateLimitScenarioId="healthy"
        onSelectPreset={vi.fn()}
        onSelectFeatureScenario={onSelectFeatureScenario}
        onSelectRepositoriesScenario={vi.fn()}
        onSelectRateLimitScenario={vi.fn()}
      />
    );

    const featureCategorySelect = screen.getByLabelText(/Actions Usage の状態種別/i);
    fireEvent.change(featureCategorySelect, { target: { value: '異常・エラー' } });
    expect(onSelectFeatureScenario).toHaveBeenCalledWith('actionsUsage', 'error');
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
    expect(screen.getByLabelText(/Repositories.*の詳細状態/i)).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.queryByLabelText(/Repositories.*の詳細状態/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /カード個別設定/i })).toBeInTheDocument();
  });
});
