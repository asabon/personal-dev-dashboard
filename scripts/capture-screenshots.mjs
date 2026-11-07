/**
 * @fileoverview デモモード（?demo=true）を利用して、README用の最新スクリーンショット（PC詳細モード・PC簡易モード・スマホ版）を自動撮影するスクリプト。
 * Vite 開発サーバーを一時起動し、Puppeteer (Chromium) で高精細キャプチャを行って docs/assets/ に上書き保存します。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'vite';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * デスクトップ表示（詳細・簡易）およびスマートフォン表示のスクリーンショットを自動撮影して docs/assets/ に保存する。
 *
 * @returns {Promise<void>}
 */
async function captureScreenshots() {
  const assetsDir = path.join(projectRoot, 'docs', 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  let server;
  let browser;

  try {
    console.log('🚀 Starting Vite development server...');
    server = await createServer({
      root: projectRoot,
      server: { port: 5173, host: '127.0.0.1' },
      logLevel: 'error',
    });
    await server.listen();
    const address = server.httpServer?.address();
    const port = typeof address === 'object' && address ? address.port : 5173;
    const baseUrl = `http://127.0.0.1:${port}/?demo=true`;
    console.log(`🌐 Vite server listening at ${baseUrl}`);

    console.log('📱 Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // 1. Desktop Screenshot (Detailed Mode)
    console.log('🖥️ Capturing Desktop preview (detailed mode)...');
    const desktopPage = await browser.newPage();
    try {
      await desktopPage.setViewport({
        width: 1280,
        height: 900,
        deviceScaleFactor: 2,
      });
      await desktopPage.evaluateOnNewDocument(() => {
        localStorage.setItem('dashboard_view_mode', 'expanded');
      });
      await desktopPage.goto(baseUrl, { waitUntil: 'networkidle0' });
      await desktopPage.waitForSelector('main');
      // アニメーションおよび Lucide アイコン等の描画完了を待機
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const desktopPath = path.join(assetsDir, 'dashboard-preview.png');
      await desktopPage.screenshot({
        path: desktopPath,
        fullPage: true,
      });
      console.log(`✅ Saved desktop preview: ${desktopPath}`);
    } finally {
      await desktopPage.close().catch(() => {});
    }

    // 2. Desktop Screenshot (Compact View Mode - 基本スタイル)
    console.log('🖥️ Capturing Desktop preview (compact view mode)...');
    const desktopCompactPage = await browser.newPage();
    try {
      await desktopCompactPage.setViewport({
        width: 1280,
        height: 900,
        deviceScaleFactor: 2,
      });
      await desktopCompactPage.evaluateOnNewDocument(() => {
        localStorage.setItem('dashboard_view_mode', 'compact');
      });
      await desktopCompactPage.goto(baseUrl, { waitUntil: 'networkidle0' });
      await desktopCompactPage.waitForSelector('main');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const desktopCompactPath = path.join(assetsDir, 'dashboard-compact-preview.png');
      await desktopCompactPage.screenshot({
        path: desktopCompactPath,
        fullPage: true,
      });
      console.log(`✅ Saved desktop compact preview: ${desktopCompactPath}`);
    } finally {
      await desktopCompactPage.close().catch(() => {});
    }

    // 3. Mobile Screenshot (Compact View Mode)
    console.log('📱 Capturing Mobile preview (compact view mode)...');
    const mobilePage = await browser.newPage();
    try {
      await mobilePage.setViewport({
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      await mobilePage.evaluateOnNewDocument(() => {
        localStorage.setItem('dashboard_view_mode', 'compact');
      });
      await mobilePage.goto(baseUrl, { waitUntil: 'networkidle0' });
      await mobilePage.waitForSelector('main');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mobilePath = path.join(assetsDir, 'dashboard-mobile-preview.png');
      await mobilePage.screenshot({
        path: mobilePath,
        fullPage: false,
      });
      console.log(`✅ Saved mobile preview: ${mobilePath}`);
    } finally {
      await mobilePage.close().catch(() => {});
    }

    console.log('🎉 All screenshots successfully updated!');
  } finally {
    if (browser) {
      await browser.close().catch((err) => console.error('Browser close error:', err));
    }
    if (server) {
      await server.close().catch((err) => console.error('Server close error:', err));
    }
  }
}

captureScreenshots().catch((err) => {
  console.error('❌ Failed to capture screenshots:', err);
  process.exit(1);
});
