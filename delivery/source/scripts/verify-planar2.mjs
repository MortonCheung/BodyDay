import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 第二轮 P0 验收：齿形开场、拖动不误判、详情页热点与 Esc 分层返回。
 */

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.BODYDAY_BASE_URL ?? 'http://localhost:5173';
const SHOTS = resolve(ROOT, 'delivery/test-evidence/screenshots/planar');
mkdirSync(SHOTS, { recursive: true });

const out = {};
const log = (key, value) => {
  out[key] = value;
  console.log(`[${key}]`, JSON.stringify(value));
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text().slice(0, 160));
});
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

/* ---------- 1. 齿形开场 ---------- */
await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.bd-entry__morph', { timeout: 15000 });
await page.waitForTimeout(400);
const gear = await page.evaluate(() => {
  const rings = Array.from(document.querySelectorAll('.bd-entry__gear'));
  return {
    count: rings.length,
    transforms: rings.map((ring) => ring.getAttribute('style')),
    morph: (() => {
      const r = document.querySelector('.bd-entry__morph').getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height) };
    })(),
  };
});
log('齿形开场', gear);
await page.screenshot({ path: `${SHOTS}/entry-gear.png` });

await page.waitForSelector('.bd-entry__morph[data-settled="true"]', { timeout: 120000 });
await page.waitForTimeout(700);
const gearAfter = await page.evaluate(() => {
  const rings = Array.from(document.querySelectorAll('.bd-entry__gear'));
  return {
    count: rings.length,
    opacity: rings.map((ring) => getComputedStyle(ring).opacity),
    settled: document.querySelector('.bd-entry__rig')?.getAttribute('data-settled'),
  };
});
log('就绪后齿环收合', gearAfter);
await page.screenshot({ path: `${SHOTS}/entry-gear-ready.png` });

await page.locator('.bd-entry__morph').click();
await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
await page.waitForTimeout(2200);

/* ---------- 2. 拖动不应被误判为点击 ---------- */
const box = await page.locator('.bd-wb-stage').boundingBox();
const beforeDrag = await page.evaluate(() => location.hash);
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.45);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.52, { steps: 24 });
await page.mouse.up();
await page.waitForTimeout(2400);
const afterDrag = await page.evaluate(() => location.hash);
log('拖动不触发跳转/选中', {
  before: beforeDrag,
  after: afterDrag,
  unchanged: beforeDrag === afterDrag,
  paperText: await page.evaluate(
    () => document.querySelector('.bd-wb-paper')?.textContent?.replace(/\s+/g, ' ').slice(0, 40),
  ),
});
await page.screenshot({ path: `${SHOTS}/after-drag.png` });

/* ---------- 3. 展开到 100% 后点心脏 → 详情 ---------- */
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
for (let i = 0; i < 40; i += 1) {
  const p = await page.evaluate(() => window.__BODYDAY_STAGE__?.probe?.progress ?? 0);
  if (p >= 0.95) break;
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(140);
}
await page.waitForTimeout(2400);
const probe = await page.evaluate(() => window.__BODYDAY_STAGE__?.probe ?? null);
const heart = probe?.screen?.heart;
if (heart) {
  await page.mouse.click(box.x + heart.x, box.y + heart.y);
  await page.waitForTimeout(3000);
}
log('点击心脏', {
  hash: await page.evaluate(() => location.hash),
  url: page.url(),
});

/* ---------- 4. 详情页：局部结构热点 + Esc 返回 ---------- */
await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(2600);
const detail = await page.evaluate(() => ({
  parts: Array.from(document.querySelectorAll('.bd-wb-parts .bd-chip')).map((n) =>
    n.textContent.trim(),
  ),
  canvas: document.querySelectorAll('canvas').length,
  paper: document.querySelector('.bd-wb-paper')?.textContent?.replace(/\s+/g, ' ').slice(0, 70),
}));
log('详情页', detail);
await page.screenshot({ path: `${SHOTS}/detail-parts.png` });

if (detail.parts.length > 0) {
  await page.locator('.bd-wb-parts .bd-chip').first().click();
  await page.waitForTimeout(2200);
  log('详情页点热点', {
    paper: await page.evaluate(
      () => document.querySelector('.bd-wb-paper')?.textContent?.replace(/\s+/g, ' ').slice(0, 70),
    ),
  });
  await page.screenshot({ path: `${SHOTS}/detail-hotspot.png` });
}

await page.keyboard.press('Escape');
await page.waitForTimeout(2000);
log('Esc 第一次（清热点）', { hash: await page.evaluate(() => location.hash) });

await page.keyboard.press('Escape');
await page.waitForTimeout(2200);
log('Esc 第二次（返回探索）', { hash: await page.evaluate(() => location.hash) });

/* ---------- 5. 系统切换不再与选中冲突 ---------- */
await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(2000);
const clickChip = async (label) => {
  const chip = page.locator('.bd-wb-control .bd-chip', { hasText: label }).first();
  if (await chip.count()) {
    await chip.click();
    await page.waitForTimeout(2200);
  }
};
const probes = {};
for (const label of ['神经系统', '呼吸系统', '全部']) {
  await clickChip(label);
  probes[label] = await page.evaluate(() => {
    const p = window.__BODYDAY_STAGE__?.probe ?? null;
    return { visible: p?.visibleMeshes ?? null, progress: p?.progress ?? null };
  });
}
log('连续切换系统', probes);
await page.screenshot({ path: `${SHOTS}/after-system-switch.png` });

log('控制台', { errors });
writeFileSync(
  resolve(ROOT, 'delivery/test-evidence/verify-planar2.json'),
  JSON.stringify(out, null, 2),
);
await browser.close();
console.log('报告：delivery/test-evidence/verify-planar2.json');
