import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 平面展开 + 交互正确性的真实浏览器验收。
 *
 * 覆盖本轮的 P0：
 * - 0 / 25 / 50 / 75 / 100% 五档截图与真实读数（单元数、深度跨度、各器官屏幕坐标）
 * - 100% 时点击心脏是否**直接**进入器官详解
 * - 系统筛选后旧选中是否被清掉、是否出现空白
 * - 详情页点空白是否返回人体探索
 */

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.BODYDAY_BASE_URL ?? 'http://localhost:5173';
const SHOTS = resolve(ROOT, 'delivery/test-evidence/screenshots/planar');
mkdirSync(SHOTS, { recursive: true });

const report = { base: BASE, stages: [], checks: {}, startedAt: new Date().toISOString() };
const note = (key, detail) => {
  report.checks[key] = detail;
  console.log(`[${key}]`, JSON.stringify(detail));
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
});
page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)));

const readProbe = () =>
  page.evaluate(() => {
    const p = window.__BODYDAY_STAGE__?.probe ?? null;
    return p
      ? {
          progress: p.progress,
          visibleMeshes: p.visibleMeshes,
          shellOpacity: p.shellOpacity,
          planar: p.planar,
          screen: p.screen,
          camera: p.camera,
        }
      : null;
  });

const stageBox = async () => {
  const box = await page.locator('.bd-wb-stage').boundingBox();
  if (!box) throw new Error('找不到舞台');
  return box;
};

/** 滚轮推进到目标进度（向下 = 展开） */
async function driveTo(target) {
  const box = await stageBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 60; i += 1) {
    const probe = await readProbe();
    if ((probe?.progress ?? 0) >= target - 0.02) break;
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(2200);
}

await page.goto(`${BASE}/#/explore`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
await page.waitForTimeout(2500);

for (const [label, target] of [
  ['000', 0],
  ['025', 0.25],
  ['050', 0.5],
  ['075', 0.75],
  ['100', 1],
]) {
  await driveTo(target);
  const probe = await readProbe();
  await page.screenshot({ path: `${SHOTS}/planar-${label}.png` });
  report.stages.push({
    label,
    progress: probe?.progress ?? null,
    visibleMeshes: probe?.visibleMeshes ?? null,
    shellOpacity: probe?.shellOpacity ?? null,
    unitCount: probe?.planar?.unitCount ?? null,
    unitDepthSpread: probe?.planar?.unitDepthSpread ?? null,
    bounds: probe?.planar?.bounds ?? null,
    heartScreen: probe?.screen?.heart ?? null,
    brainScreen: probe?.screen?.cerebrum ?? null,
    camera: probe?.camera ?? null,
  });
  console.log(`[stage ${label}]`, JSON.stringify(report.stages.at(-1)));
}

/* ---------- 100%：点击心脏 → 应直接进入器官详解 ---------- */
const atFull = report.stages.at(-1);
const box = await stageBox();
let directDetail = null;
if (atFull?.heartScreen) {
  await page.mouse.click(box.x + atFull.heartScreen.x, box.y + atFull.heartScreen.y);
  await page.waitForTimeout(2600);
  directDetail = {
    hash: await page.evaluate(() => location.hash),
    paper: await page.evaluate(
      () => document.querySelector('.bd-wb-paper')?.textContent?.replace(/\s+/g, ' ').slice(0, 80),
    ),
  };
} else {
  directDetail = { hash: null, note: '100% 时心脏没有可点击的投影坐标' };
}
note('点击心脏是否直接进入详情', directDetail);
await page.screenshot({ path: `${SHOTS}/planar-click-heart.png` });

/* ---------- 详情页点空白 → 返回探索 ---------- */
await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
await page.waitForTimeout(2000);
const detailBox = await stageBox();
/* 舞台左上角通常是空白（器官居中） */
await page.mouse.click(detailBox.x + 24, detailBox.y + 24);
await page.waitForTimeout(2200);
note('详情页点空白', { hash: await page.evaluate(() => location.hash) });
await page.screenshot({ path: `${SHOTS}/planar-detail-blank.png` });

/* ---------- 系统筛选冲突：先点神经系统，再点全部 ---------- */
await page.goto(`${BASE}/#/explore`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
await page.waitForTimeout(2200);

const chips = await page.locator('.bd-wb-control .bd-chip').allInnerTexts();
note('左栏系统按钮', { chips, count: chips.length, hasReproductive: chips.includes('生殖系统') });

const clickChip = async (label) => {
  const chip = page.locator('.bd-wb-control .bd-chip', { hasText: label }).first();
  if (await chip.count()) {
    await chip.click();
    await page.waitForTimeout(2400);
  }
};

await clickChip('神经系统');
const afterNervous = await readProbe();
note('筛选神经系统', {
  visibleMeshes: afterNervous?.visibleMeshes ?? null,
  paper: await page.evaluate(
    () => document.querySelector('.bd-wb-paper')?.textContent?.replace(/\s+/g, ' ').slice(0, 60),
  ),
});
await page.screenshot({ path: `${SHOTS}/planar-filter-nervous.png` });

/* 在神经系统内展开，检查布局是按该系统重算的 */
await driveTo(1);
const nervousExploded = await readProbe();
note('神经系统展开', {
  progress: nervousExploded?.progress,
  unitCount: nervousExploded?.planar?.unitCount,
  depthSpread: nervousExploded?.planar?.depthSpread,
  visibleMeshes: nervousExploded?.visibleMeshes,
});
await page.screenshot({ path: `${SHOTS}/planar-filter-nervous-exploded.png` });

await clickChip('全部');
const afterAll = await readProbe();
note('回到全部', {
  visibleMeshes: afterAll?.visibleMeshes ?? null,
  progress: afterAll?.progress ?? null,
});
await page.screenshot({ path: `${SHOTS}/planar-filter-all.png` });

/* 连续切换三个系统 */
for (const label of ['循环系统', '骨骼系统', '呼吸系统']) {
  await clickChip(label);
  const probe = await readProbe();
  note(`切换 ${label}`, { visibleMeshes: probe?.visibleMeshes ?? null });
}

note('控制台', { errors });
report.finishedAt = new Date().toISOString();
writeFileSync(resolve(ROOT, 'delivery/test-evidence/verify-planar.json'), JSON.stringify(report, null, 2));
console.log('报告：delivery/test-evidence/verify-planar.json');

await browser.close();
