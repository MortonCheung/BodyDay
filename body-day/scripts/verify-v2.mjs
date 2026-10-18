import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * BodyDay V2 · 真实浏览器验收（对应任务书第 10 节的测试 A–G）。
 *
 * 前置：`npx vite --port 5175 --strictPort`（不要占用 5173）+ playwright 可用。
 * 运行：`node scripts/verify-v2.mjs`
 *
 * 关键点：滚轮、点击、相机恢复都用**真实输入**验证，并读取页面自己上报的运行时读数
 * （`window.__BODYDAY_STAGE__`，仅开发模式暴露），不接受「状态值看起来对」这种判断。
 */

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.BODYDAY_BASE_URL ?? 'http://localhost:5175';
const SHOTS = resolve(ROOT, 'delivery/test-evidence/screenshots/v2-interaction');
mkdirSync(SHOTS, { recursive: true });

const report = { base: BASE, startedAt: new Date().toISOString(), tests: {}, steps: [] };
const log = (step, detail) => {
  report.steps.push({ step, detail });
  console.log(`[${step}]`, JSON.stringify(detail));
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const pageErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') pageErrors.push(msg.text().slice(0, 200));
});
page.on('pageerror', (error) => pageErrors.push(String(error).slice(0, 200)));

const readStage = () =>
  page.evaluate(() => {
    const state = window.__BODYDAY_STAGE__;
    const paper = document.querySelector('.bd-wb-paper');
    /* 选中态：V2.1 用「当前选中」区块，10/18 起改为「当前结构」结构卡（两者都接受） */
    const selection =
      paper?.querySelector('[aria-label="当前结构"]') ?? paper?.querySelector('[aria-label="当前选中"]');
    return {
      probe: state?.probe ?? null,
      view: state?.view ?? null,
      paperTitle: paper?.querySelector('.bd-title')?.textContent?.trim() ?? null,
      selected: Boolean(selection),
      drillLinks: Array.from(document.querySelectorAll('.bd-drill a')).map((a) => a.textContent.trim()),
      hasScaleAxis: Boolean(document.querySelector('.bd-scaleline')),
      hasQuickIndex: Boolean(document.querySelector('.bd-wb-index')),
      hasClock: Boolean(document.querySelector('.bd-clock')),
      stageActions: document.querySelectorAll('.bd-wb-stage__actions button').length,
      navItems: Array.from(document.querySelectorAll('.bd-nav__item')).map((a) => a.textContent.trim()),
      sliderDisplay: (() => {
        const el = document.querySelector('[data-testid="explode-slider"]');
        return el ? getComputedStyle(el.closest('.bd-wb-explode') ?? el).display : null;
      })(),
      canvasCount: document.querySelectorAll('canvas').length,
    };
  });

const camera = (probe) =>
  probe
    ? {
        position: probe.camera.position.map((n) => Number(n.toFixed(4))),
        target: probe.camera.target.map((n) => Number(n.toFixed(4))),
        distance: Number(probe.camera.distance.toFixed(4)),
      }
    : null;

await page.goto(`${BASE}/#/body`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
await page.waitForTimeout(2600);
const stageBox = await page.locator('.bd-wb-stage').boundingBox();
const center = { x: stageBox.x + stageBox.width / 2, y: stageBox.y + stageBox.height / 2 };

/* ---------------- A. 进入与默认展示 ---------------- */
{
  const state = await readStage();
  report.tests.A = {
    visibleMeshes: state.probe.visibleMeshes,
    shellOpacity: state.probe.shellOpacity,
    publicFilterRemoved: 984 - state.probe.visibleMeshes,
    camera: camera(state.probe),
    navItems: state.navItems,
  };
  log('A 默认人体展示', report.tests.A);
  await page.screenshot({ path: `${SHOTS}/test-A-body.png` });
}

/* ---------------- B. 滚轮拆解 ---------------- */
{
  await page.mouse.move(center.x, center.y);
  const before = (await readStage()).probe.progress;
  for (let step = 0; step < 6; step += 1) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(900);
  const afterDown = (await readStage()).probe.progress;
  /* 就在「向下滚到最深处」这一刻读数：拆解态真实可见网格数与外壳不透明度 */
  const explodedSnap = (await readStage()).probe;
  await page.screenshot({ path: `${SHOTS}/test-B-exploded.png` });
  for (let step = 0; step < 3; step += 1) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(900);
  const afterUp = (await readStage()).probe.progress;

  /* 滚轮拆解后，真实几何是否跟着位移（读心脏的包围盒中心） */
  const centersDown = (await readStage()).probe.centers;
  const geometryMoved = Math.abs(centersDown.heart[2] - 0) > 0.001;

  report.tests.B = {
    before: Number(before.toFixed(3)),
    afterScrollDown: Number(afterDown.toFixed(3)),
    /* 拆解态实测值（取自向下滚到底的那一刻，不做算术推断） */
    visibleMeshesExploded: explodedSnap.visibleMeshes,
    shellOpacityExploded: explodedSnap.shellOpacity,
    afterScrollUp: Number(afterUp.toFixed(3)),
    explodedOnDown: afterDown > before,
    reassembledOnUp: afterUp < afterDown,
    geometryMoved,
    heartCenter: centersDown.heart.map((n) => Number(n.toFixed(4))),
    desktopSliderHidden: (await readStage()).sliderDisplay === 'none',
  };
  log('B 滚轮拆解/组装', report.tests.B);
  await page.screenshot({ path: `${SHOTS}/test-B-wheel-explode.png` });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
  await page.waitForTimeout(2400);
}

/* ---------------- C. 选中：高亮 + 淡化（不消失） ---------------- */
{
  const before = await readStage();
  await page.mouse.click(center.x, center.y);
  await page.waitForTimeout(2200);
  const after = await readStage();
  report.tests.C = {
    focusTargetId: after.view?.focusTargetId ?? null,
    selected: after.selected,
    paperTitle: after.paperTitle,
    visibleMeshesBefore: before.probe.visibleMeshes,
    visibleMeshesAfter: after.probe.visibleMeshes,
    othersStillVisible: after.probe.visibleMeshes >= before.probe.visibleMeshes - 20,
    cameraMoved: camera(before.probe).distance !== camera(after.probe).distance,
  };
  log('C 选中高亮 + 其余淡化', report.tests.C);
  await page.screenshot({ path: `${SHOTS}/test-C-select-skin.png` });
}

/* ---------------- D. 取消选中后回到选中前的视角 ---------------- */
{
  /* 先转到一个非默认角度 */
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 180, center.y + 40, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(1800);
  await page.mouse.click(stageBox.x + stageBox.width - 40, stageBox.y + 30); // 点空白取消
  await page.waitForTimeout(3000);

  /* 拆解一点（这会改变整体取景），然后**在点击之前**记录快照：测试要对比的是紧邻聚焦前的状态 */
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="explode-slider"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, '55');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(2600);
  const snapshot = camera((await readStage()).probe);
  report.tests.D = { snapshotBeforeFocus: snapshot };
  const probe = (await readStage()).probe;
  const heart = probe.screen?.heart;
  if (heart) {
    await page.mouse.click(stageBox.x + heart.x, stageBox.y + heart.y);
    await page.waitForTimeout(2600);
  }
  const focused = await readStage();
  report.tests.D.focusedTargetId = focused.view?.focusTargetId ?? null;
  report.tests.D.cameraAfterFocus = camera(focused.probe);
  await page.screenshot({ path: `${SHOTS}/test-D-focused-heart.png` });

  /* 点空白 → 应恢复到 snapshot */
  await page.mouse.click(stageBox.x + stageBox.width - 40, stageBox.y + 30);
  await page.waitForTimeout(4200);
  const restored = await readStage();
  const restoredCamera = camera(restored.probe);
  const delta = restoredCamera
    ? Math.hypot(
        restoredCamera.position[0] - snapshot.position[0],
        restoredCamera.position[1] - snapshot.position[1],
        restoredCamera.position[2] - snapshot.position[2],
      )
    : null;
  const targetDelta = restoredCamera
    ? Math.hypot(
        restoredCamera.target[0] - snapshot.target[0],
        restoredCamera.target[1] - snapshot.target[1],
        restoredCamera.target[2] - snapshot.target[2],
      )
    : null;
  report.tests.D.selectionCleared = restored.view?.focusTargetId === null;
  report.tests.D.cameraAfterRestore = restoredCamera;
  report.tests.D.positionDelta = delta === null ? null : Number(delta.toFixed(4));
  report.tests.D.targetDelta = targetDelta === null ? null : Number(targetDelta.toFixed(4));
  report.tests.D.restored = Boolean(delta !== null && delta < 0.12 && targetDelta < 0.12);
  log('D 取消选中后恢复原视角', report.tests.D);
  await page.screenshot({ path: `${SHOTS}/test-D-after-restore.png` });
}

/* ---------------- E. 跨尺度链路 ---------------- */
{
  await page.goto(`${BASE}/#/organ/brain`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const brain = await readStage();
  const neuronLink = page.locator('.bd-drill a', { hasText: '神经元' }).first();
  let neuronReached = false;
  if (await neuronLink.count()) {
    await neuronLink.click();
    await page.waitForTimeout(2600);
    neuronReached = page.url().includes('/cell/neuron');
  }
  await page.goto(`${BASE}/#/organ/spleen`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const spleen = await readStage();
  report.tests.E = {
    brainVisibleMeshes: brain.probe?.visibleMeshes ?? null,
    brainDrill: brain.drillLinks,
    neuronReached,
    spleenDrill: spleen.drillLinks,
    spleenPageTitle: spleen.paperTitle,
    canvasCount: spleen.canvasCount,
  };
  log('E 跨尺度链路', report.tests.E);
  await page.goto(`${BASE}/#/cell/neuron`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${SHOTS}/test-E-cell-neuron.png` });
}

/* ---------------- F. UI 结构 ---------------- */
{
  await page.goto(`${BASE}/#/body`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const state = await readStage();
  report.tests.F = {
    navItems: state.navItems,
    hasScaleAxis: state.hasScaleAxis,
    hasQuickIndex: state.hasQuickIndex,
    hasClock: state.hasClock,
    stageActionButtons: state.stageActions,
    desktopSliderHidden: state.sliderDisplay === 'none',
    canvasCount: state.canvasCount,
  };
  log('F UI 结构', report.tests.F);
  await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  report.tests.F.aboutHasLicense = (await page.evaluate(() =>
    (document.body.textContent || '').includes('CC BY-SA 4.0'),
  ));
  await page.screenshot({ path: `${SHOTS}/test-F-about.png` });
}

/* ---------------- G. 工程与稳定性 ---------------- */
{
  report.tests.G = {
    pageErrors,
    consoleErrorCount: pageErrors.length,
    readyStats: (await readStage()).probe ? true : false,
  };
  log('G 控制台与稳定性', report.tests.G);
}

report.finishedAt = new Date().toISOString();
writeFileSync(resolve(ROOT, 'delivery/test-evidence/verify-v2.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ tests: report.tests }, null, 1));
await browser.close();
