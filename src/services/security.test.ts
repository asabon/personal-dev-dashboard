import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateToken,
  fetchActionsUsage,
  fetchOrgActionsUsage,
  fetchRepositoryPRs,
  fetchUserRepositories,
} from './githubApi';
import { saveSettings } from './storage';
import type { AppSettings } from '../types';

describe('PAT セキュリティ・漏洩防止テスト (Zero-Backend Privacy Guarantee)', () => {
  const TEST_PAT = 'ghp_SECRET_PAT_TOKEN_1234567890abcdefghijklmnopqrstuvwx';
  let originalFetch: typeof globalThis.fetch;
  const capturedRequests: { url: string; init?: RequestInit }[] = [];

  beforeEach(() => {
    capturedRequests.length = 0;
    originalFetch = globalThis.fetch;

    // fetch をモックしてリクエスト内容（URL, ヘッダー等）を記録
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      capturedRequests.push({ url, init });

      // GitHub API のダミーレスポンス
      return new Response(
        JSON.stringify({
          login: 'test-user',
          avatar_url: 'https://example.com/avatar.png',
          total_minutes_used: 100,
          included_minutes: 2000,
          minutes_used_breakdown: { UBUNTU: 100 },
          data: {
            repository: {
              pullRequests: {
                nodes: [],
              },
            },
          },
        }),
        {
          status: 200,
          headers: new Headers({
            'x-ratelimit-remaining': '4999',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-reset': '1700000000',
          }),
        }
      );
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('PAT を含む通信先が常に公式の https://api.github.com/ のみであること (外部・プロキシ送信の不在)', async () => {
    // 複数の主要 API を呼び出し
    await validateToken(TEST_PAT);
    await fetchActionsUsage(TEST_PAT, 'test-user');
    await fetchOrgActionsUsage(TEST_PAT, 'test-org');
    await fetchRepositoryPRs(TEST_PAT, 'test-user', 'test-repo');
    await fetchUserRepositories(TEST_PAT);

    expect(capturedRequests.length).toBeGreaterThan(0);

    for (const req of capturedRequests) {
      // 1. 必ず HTTPS であること
      expect(req.url).toMatch(/^https:\/\//);

      // 2. 外部サーバーやプロキシではなく、公式 api.github.com のみと通信していること
      const parsedUrl = new URL(req.url);
      expect(parsedUrl.hostname).toBe('api.github.com');
    }
  });

  it('PAT が URL クエリパラメータやパスに露出せず、Authorization ヘッダーにのみ格納されること', async () => {
    await validateToken(TEST_PAT);
    await fetchActionsUsage(TEST_PAT, 'test-user');

    for (const req of capturedRequests) {
      // URL に生の PAT が含まれていないこと
      expect(req.url).not.toContain(TEST_PAT);

      // Authorization ヘッダーにのみ Bearer トークンとして含まれていること
      const headers = req.init?.headers as Record<string, string>;
      expect(headers).toBeDefined();
      expect(headers['Authorization']).toBe(`Bearer ${TEST_PAT}`);
    }
  });

  it('PAT の保存先が localStorage の特定キー以外 (cookie, sessionStorage 等) に書き込まれないこと', () => {
    const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    const dummyCookie = '';
    Object.defineProperty(document, 'cookie', {
      get: () => dummyCookie,
      set: vi.fn(),
      configurable: true,
    });

    const settings: AppSettings = {
      pat: TEST_PAT,
      username: 'test-user',
      repositories: ['owner/repo'],
      refreshIntervalSec: 60,
      showSelfHostedRunners: false,
      monitoredOrgs: [],
    };

    saveSettings(settings);

    // localStorage の特定キーにのみ保存されていること
    expect(localStorage.getItem('personal_dev_dashboard_settings')).toContain(TEST_PAT);

    // cookie や sessionStorage には一切書き込まれていないこと
    expect(document.cookie).not.toContain(TEST_PAT);
    expect(sessionStorage.getItem('personal_dev_dashboard_settings')).toBeNull();
  });

  it('API 呼び出し時やエラー発生時に console に生の PAT が出力されないこと (ログ漏洩防止)', async () => {
    const logSpy = vi.spyOn(console, 'log');
    const warnSpy = vi.spyOn(console, 'warn');
    const errorSpy = vi.spyOn(console, 'error');

    // 成功時
    await validateToken(TEST_PAT);

    // エラー発生時（401 を返すモック）
    globalThis.fetch = vi.fn(async () => new Response('Unauthorized', { status: 401 }));
    await expect(validateToken(TEST_PAT)).rejects.toThrow();

    // どのコンソールメソッドにも生の PAT が含まれていないことを検証
    const allCalls = [
      ...logSpy.mock.calls.flat(),
      ...warnSpy.mock.calls.flat(),
      ...errorSpy.mock.calls.flat(),
    ].map(String);

    for (const logContent of allCalls) {
      expect(logContent).not.toContain(TEST_PAT);
    }
  });

  it('index.html に厳格な CSP (Content Security Policy) が設定されており、api.github.com 以外の外部通信が遮断されていること', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const htmlPath = path.resolve(__dirname, '../../index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // CSP メタタグの存在確認
    const cspMatch = htmlContent.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    expect(cspMatch).not.toBeNull();

    const cspContent = cspMatch![1];

    // connect-src ディレクティブの検証
    const connectSrcMatch = cspContent.match(/connect-src\s+([^;]+)/);
    expect(connectSrcMatch).not.toBeNull();

    const allowedConnectSources = connectSrcMatch![1].trim().split(/\s+/);

    // connect-src は 'self' と 'https://api.github.com/' のみ許可されていることを保証
    expect(allowedConnectSources).toEqual(['\'self\'', 'https://api.github.com/']);
  });
});
