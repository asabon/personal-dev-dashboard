import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App Demo Mode (?demo=true)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
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

    // デモ用 Actions 使用量が表示されること
    expect(screen.getByText('当月の使用量')).toBeInTheDocument();
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
});
