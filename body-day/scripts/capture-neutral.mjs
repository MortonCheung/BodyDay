import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.BODYDAY_BASE_URL ?? 'http://localhost:5173';
const OUT = resolve(ROOT, 'delivery/test-evidence/screenshots/neutral');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(`${BASE}/#/body`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
await page.waitForTimeout(3200);

const box = await page.locator('.bd-wb-stage').boundingBox();
/* 骨盆区域：画面纵向 55%–88%，横向 30%–70% */
const clip = {
  x: box.x + box.width * 0.28,
  y: box.y + box.height * 0.42,
  width: box.width * 0.44,
  height: box.height * 0.36,
};
await page.screenshot({ path: `${OUT}/pelvis-front.png`, clip });

const drag = async (dx) => {
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 0.42);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height * 0.45, { steps: 22 });
  await page.mouse.up();
  await page.waitForTimeout(2400);
};
await drag(300);
await page.screenshot({ path: `${OUT}/pelvis-side.png`, clip });
await drag(300);
await page.screenshot({ path: `${OUT}/pelvis-back.png`, clip });

/* 全图也留一张，便于对比轮廓 */
await page.screenshot({ path: `${OUT}/body-full.png` });
console.log('中性化截图完成');
await browser.close();
