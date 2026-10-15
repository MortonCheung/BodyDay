import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * BodyDay V2 · 交付截图与体验录像生成脚本。
 *
 * 前置：
 *   1. 先启动用于自测的开发服务器：`npx vite --port 5175 --strictPort`
 *      （不要占用 5173，那是日常预览端口）
 *   2. 需要 playwright 可用（`npm i -D playwright` 或环境中已安装）
 * 运行：`node scripts/capture-screenshots.mjs`
 *
 * 产物：
 *   - <repo>/delivery/test-evidence/screenshots/*.png（14 张，1440×900；移动端 390×844）
 *   - <repo>/delivery/test-evidence/capture.json（本次生成记录）
 *   - 体验录像的原始 webm 写在系统临时目录（Chrome 只能录 webm），
 *     转成交付用 mp4：`ffmpeg -y -i <webm> -c:v libx264 -preset medium -crf 24
 *     -pix_fmt yuv420p -movflags +faststart delivery/demo/bodyday-v2-walkthrough.mp4`
 *
 * 截图覆盖 11 个可直达页面 + 拆解的中间/完全两个状态 + 移动端；
 * 录像用同一个 context 连续走完「封面 → 进入 → 旋转 → 拆解 → 选器官 →
 * 进器官页 → 下潜细胞 → 关于」，因此是真人在真实浏览器里的完整链路，不是拼帧。
 */

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.BODYDAY_BASE_URL ?? 'http://localhost:5175';
const SHOTS = resolve(ROOT, 'delivery/test-evidence/screenshots');
const VIDEO_DIR = resolve(tmpdir(), 'bodyday-v2-video');
mkdirSync(SHOTS, { recursive: true });
mkdirSync(VIDEO_DIR, { recursive: true });

const report = { base: BASE, steps: [], shots: [], video: null };

async function setExplode(page, percent) {
  await page.evaluate((value) => {
    const el = document.querySelector('[data-testid="explode-slider"]');
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, percent);
  await page.waitForTimeout(1900);
}

const readProbe = (page) => page.evaluate(() => window.__BODYDAY_STAGE__ ?? null);

async function clickAt(page, point) {
  const box = await page.locator('.bd-wb-stage').boundingBox();
  await page.mouse.click(box.x + point.x, box.y + point.y);
  await page.waitForTimeout(1800);
}

/** 投影点是包围盒中心，可能落在几何空隙里：小范围尝试，直到「当前选中」区块真的出现操作按钮 */
async function clickUntilSelected(page, point) {
  const offsets = [[0, 0], [0, 16], [0, -16], [16, 0], [-16, 0], [0, 30], [0, -30]];
  for (const [dx, dy] of offsets) {
    await clickAt(page, { x: point.x + dx, y: point.y + dy });
    const ok = await page.evaluate(() =>
      Boolean(document.querySelector('.bd-wb-paper [aria-label="当前选中"] button')),
    );
    if (ok) return true;
  }
  return false;
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});

/* ---------------- 一、稳定截图（1440×900） ---------------- */
const shotContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await shotContext.newPage();
const shot = async (name) => {
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  report.shots.push(name);
};

await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: '进入探索' }).waitFor({ timeout: 120000 });
await page.waitForTimeout(1200);
await shot('01-cover');

await page.getByRole('button', { name: '进入探索' }).click();
await page.waitForTimeout(3500);
await shot('02-body');

await setExplode(page, 25);
await shot('03-explode-25');

await setExplode(page, 100);
await shot('04-explode-100');
report.steps.push({ step: '拆解读数（可见网格数）', detail: (await readProbe(page))?.probe?.visibleMeshes });

await setExplode(page, 0);
await page.waitForTimeout(1200);

for (const [name, system] of [
  ['05-system-nervous', 'nervous-system'],
  ['06-system-cardiovascular', 'cardiovascular-system'],
  ['07-system-lymphatic', 'lymphatic-system'],
]) {
  await page.goto(`${BASE}/#/systems/${system}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await shot(name);
}

for (const [name, organ] of [
  ['08-organ-brain', 'brain'],
  ['09-organ-heart', 'heart'],
  ['10-organ-spleen', 'spleen'],
]) {
  await page.goto(`${BASE}/#/organ/${organ}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2800);
  await shot(name);
  report.steps.push({ step: `器官页 ${organ} 可见网格数`, detail: (await readProbe(page))?.probe?.visibleMeshes });
}

for (const [name, cell] of [
  ['11-cell-neuron', 'neuron'],
  ['12-cell-leukocyte', 'leukocyte'],
]) {
  await page.goto(`${BASE}/#/cell/${cell}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await shot(name);
}

await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1400);
await shot('13-about');
await shotContext.close();

/* ---------------- 二、移动端截图（390×844） ---------------- */
const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mpage = await mobileContext.newPage();
await mpage.goto(`${BASE}/#/body`, { waitUntil: 'domcontentloaded' });
await mpage.waitForTimeout(4500);
await mpage.screenshot({ path: `${SHOTS}/14-mobile-390x844.png` });
report.shots.push('14-mobile-390x844');
report.steps.push({
  step: '移动端视口检查',
  detail: await mpage.evaluate(() => ({
    viewport: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    sheet: document.querySelector('.bd-wb-paper')?.getAttribute('data-sheet'),
  })),
});
await mobileContext.close();

/* ---------------- 三、体验录像 ---------------- */
const videoContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
});
const vpage = await videoContext.newPage();
const pause = (ms) => vpage.waitForTimeout(ms);

await vpage.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
await vpage.getByRole('button', { name: '进入探索' }).waitFor({ timeout: 120000 });
await pause(2600);
await vpage.getByRole('button', { name: '进入探索' }).click();
await pause(4200);

const stageBox = await vpage.locator('.bd-wb-stage').boundingBox();
await vpage.mouse.move(stageBox.x + stageBox.width * 0.5, stageBox.y + stageBox.height * 0.5);
await vpage.mouse.down();
await vpage.mouse.move(stageBox.x + stageBox.width * 0.36, stageBox.y + stageBox.height * 0.5, { steps: 24 });
await vpage.mouse.up();
await pause(2200);

for (const percent of [30, 62, 100]) {
  await setExplode(vpage, percent);
  await pause(600);
}

const probe = (await readProbe(vpage))?.probe;
if (probe?.screen?.heart) {
  await clickUntilSelected(vpage, probe.screen.heart);
  await pause(1600);
  const heartLink = vpage.locator('.bd-drill a', { hasText: '心脏' }).first();
  if (await heartLink.count()) {
    await heartLink.click();
    await pause(3000);
  }
}

const clearBtn = vpage.locator('.bd-wb-stage__actions button', { hasText: '取消选中' });
if (await clearBtn.count()) {
  await clearBtn.first().click();
  await pause(1400);
}

await vpage.goto(`${BASE}/#/body`, { waitUntil: 'domcontentloaded' });
await pause(3200);
const bodyProbe = (await readProbe(vpage))?.probe;
if (bodyProbe?.screen?.heart) {
  await setExplode(vpage, 60);
  await clickUntilSelected(vpage, bodyProbe.screen.heart);
  await pause(1200);
}

await vpage.goto(`${BASE}/#/organ/brain`, { waitUntil: 'domcontentloaded' });
await pause(3000);
const neuronLink = vpage.locator('.bd-drill a', { hasText: '神经元' }).first();
if (await neuronLink.count()) {
  await neuronLink.click();
  await pause(3600);
}

await vpage.goto(`${BASE}/#/organ/spleen`, { waitUntil: 'domcontentloaded' });
await pause(3000);
const leukocyteLink = vpage.locator('.bd-drill a', { hasText: '白细胞' }).first();
if (await leukocyteLink.count()) {
  await leukocyteLink.click();
  await pause(3600);
}

await vpage.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
await pause(2600);

await videoContext.close();
report.video = readdirSync(VIDEO_DIR).find((name) => name.endsWith('.webm')) ?? null;
report.finishedAt = new Date().toISOString();
writeFileSync(resolve(ROOT, 'delivery/test-evidence/capture.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
