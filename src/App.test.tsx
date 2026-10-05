import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App';

describe('App Demo Mode (?demo=true)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    // location を復元
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('URL に ?demo=true がある場合、オンボーディングを出さずデモバナーとモックデータを表示すること', () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?demo=true',
    } as any;

    render(<App />);

    // デモバナーが表示されること
    expect(screen.getByText(/デモモード表示中:/)).toBeInTheDocument();

    // 通常のオンボーディングモーダル（「初期設定」「Personal Access Token を入力」）が表示されないこと
    expect(screen.queryByText('Personal Access Token を入力')).not.toBeInTheDocument();

    // デモ用リポジトリが表示されること
    expect(screen.getByText('asabon/personal-dev-dashboard')).toBeInTheDocument();
    expect(screen.getByText('octocat/frontend-app')).toBeInTheDocument();

    // デモ用 Actions 使用量が個人・Orgの両方同時に表示されること
    expect(screen.getByText('demo-developer')).toBeInTheDocument();
    expect(screen.getByText('demo-org')).toBeInTheDocument();
    expect(screen.getByText('2/2 目安以下')).toBeInTheDocument();
    expect(screen.getByText('Self-hosted Runners')).toBeInTheDocument();
  });

  it('通常アクセス（demoパラメータなし & PAT未設定）の場合はオンボーディングモーダルが表示されること', () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '',
    } as any;

    render(<App />);

    // オンボーディングモーダルの開始ボタンが表示されること
    expect(screen.getByText('ダッシュボードを開始')).toBeInTheDocument();
  });

  it('表示モード（簡易 / 詳細）の切り替えトグルが正しく動作すること', async () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?demo=true',
    } as any;

    window.innerWidth = 1200;

    render(<App />);

    // トグルボタンの取得
    const toggleBtn = screen.getByRole('button', { name: /詳細表示に切り替え|簡易表示に切り替え/ });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(localStorage.getItem('dashboard_view_mode')).toBe('compact');

    fireEvent.click(toggleBtn);
    expect(localStorage.getItem('dashboard_view_mode')).toBe('expanded');
  });
});

describe('App Debug Mode (?debug=true)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-25T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('URL に ?debug=true がある場合、オンボーディングを出さずデバッグバーを表示し、デモバナーは非表示であること', () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?debug=true',
    } as any;

    render(<App />);

    // デバッグバーが表示されること
    expect(screen.getByTestId('debug-bar')).toBeInTheDocument();
    expect(screen.getByText('DEBUG MODE')).toBeInTheDocument();

    // デモバナーは表示されないこと
    expect(screen.queryByText(/デモモード表示中:/)).not.toBeInTheDocument();

    // オンボーディングモーダルが表示されないこと
    expect(screen.queryByText('Personal Access Token を入力')).not.toBeInTheDocument();
  });

  it('一括プリセットで「障害・枯渇 (Critical)」を選択すると、カード・アラートがクリティカル状態に切り替わること', () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?debug=true',
    } as any;

    render(<App />);

    // Critical プリセットをクリック
    const criticalButton = screen.getByRole('button', { name: '障害・枯渇 (Critical)' });
    fireEvent.click(criticalButton);

    // アラートサマリーに Critical アラートが表示されること (Actions 残0% など)
    expect(screen.getByText(/Actions 残0%/)).toBeInTheDocument();
    expect(screen.getByText(/Runner 停止:/)).toBeInTheDocument();
  });

  it('個別セレクタで Actions Usage を「警告域 (85%)」に切り替えるとアラートが反映されること', () => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      search: '?debug=true',
    } as any;

    render(<App />);

    const actionsSelect = screen.getByLabelText(/Actions Usage の詳細状態/i);
    fireEvent.change(actionsSelect, { target: { value: 'warning' } });

    // 残15% 警告が表示されること
    expect(screen.getByText(/Actions 残15%/)).toBeInTheDocument();
  });
});
