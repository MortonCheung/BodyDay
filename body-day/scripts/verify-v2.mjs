import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * BodyDay V2 · 真实浏览器验收脚本。
 *
 * 前置：`npx vite --port 5175 --strictPort`（不要占用 5173）+ playwright 可用。
 * 运行：`node scripts/verify-v2.mjs`
 *
 * 这一轮用**相机投影出来的真实屏幕坐标**去点击具体器官，所以
 * 「拆解之后还能不能点中结构」不靠肉眼判断，而是可复现的读数。
 * 读数来源：舞台通过 `onProbe` 上报的 `window.__BODYDAY_STAGE__`（仅开发模式暴露）。
 */

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.BODYDAY_BASE_URL ?? 'http://localhost:5175';
const SHOTS = resolve(tmpdir(), 'bodyday-v2-verify-shots');
mkdirSync(SHOTS, { recursive: true });

const report = { base: BASE, startedAt: new Date().toISOString(), steps: [], readings: {} };
const log = (step, detail) => {
  report.steps.push({ step, detail });
  console.log(`[${step}]`, JSON.stringify(detail));
};

async function snap(page) {
  return page.evaluate(() => {
    const state = window.__BODYDAY_STAGE__ ?? null;
    const paper = document.querySelector('.bd-wb-paper');
    const selection = paper?.querySelector('[aria-label="当前选中"]');
    return {
      stats: state?.stats ?? null,
      probe: state?.probe ?? null,
      view: state?.view ?? null,
      paperTitle: paper?.querySelector('.bd-title')?.textContent?.trim() ?? null,
      selectionText: selection?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 300) ?? null,
      /** 判定依据：选中时「当前选中」区块里才会出现操作按钮 */
      selected: Boolean(selection?.querySelector('button')),
      drillLinks: Array.from(document.querySelectorAll('.bd-drill a')).map((a) => a.textContent.trim()),
      quickLinks: Array.from(document.querySelectorAll('.bd-wb-index__item')).map((a) => a.textContent.trim()),
      scale: document.querySelector('.bd-scale')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      headerNav: Array.from(document.querySelectorAll('.bd-nav__item')).map((a) => a.textContent.trim()),
      coverPresent: Boolean(document.querySelector('.bd-cover')),
      stageInert: document.querySelector('.bd-shell')?.hasAttribute('inert') ?? null,
    };
  });
}

async function setExplode(page, percent) {
  await page.evaluate((value) => {
    const el = document.querySelector('[data-testid="explode-slider"]');
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, percent);
  await page.waitForTimeout(1800);
}

/** 按探针给出的屏幕坐标点击（坐标相对画布左上角，画布 = 舞台内 inset 0） */
async function clickPoint(page, point) {
  const box = await page.locator('.bd-wb-stage').boundingBox();
  await page.mouse.click(box.x + point.x, box.y + point.y);
  await page.waitForTimeout(1800);
}

/** 投影点是包围盒中心，可能落在几何空隙里：小范围尝试，直到真的选中 */
async function clickGuarded(page, point, label) {
  const offsets = [[0, 0], [0, 16], [0, -16], [16, 0], [-16, 0], [0, 30], [0, -30]];
  const tried = [];
  for (const [dx, dy] of offsets) {
    const at = { x: point.x + dx, y: point.y + dy };
    await clickPoint(page, at);
    const s = await snap(page);
    tried.push({ dx, dy, selected: s.selected });
    if (s.selected) {
      log(`${label} 命中`, { at, tried, paper: s.selectionText });
      return s;
    }
  }
  log(`${label} 未命中`, tried);
  return snap(page);
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('console', (msg) => {
  if (msg.type() === 'error') report.steps.push({ step: 'console.error', detail: msg.text() });
});

try {
  /* 1. 封面闸门 */
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const loadingSnap = await snap(page);
  report.readings.coverLoading = {
    coverPresent: loadingSnap.coverPresent,
    inert: loadingSnap.stageInert,
  };
  log('封面（加载中）', report.readings.coverLoading);

  await page.getByRole('button', { name: '进入探索' }).waitFor({ timeout: 180000 });
  const readySnap = await snap(page);
  report.readings.readyStats = readySnap.stats;
  report.readings.coverReady = { inert: readySnap.stageInert };
  log('封面（就绪）', { inert: readySnap.stageInert, loadMs: readySnap.stats?.loadMs });

  await page.getByRole('button', { name: '进入探索' }).click();
  await page.waitForTimeout(3200);
  const body = await snap(page);
  report.readings.body = {
    coverGone: !body.coverPresent,
    inert: body.stageInert,
    visibleMeshes: body.probe?.visibleMeshes,
    shellOpacity: body.probe?.shellOpacity,
    cameraDistance: body.probe?.camera?.distance,
    headerNav: body.headerNav,
  };
  log('进入后（完整人体）', report.readings.body);

  /* 2. 装配态点选（皮肤挡在前面） */
  const assembledClick = await clickGuarded(page, body.probe?.screen?.cerebrum, '装配态点大脑屏幕位置');
  report.readings.clickAssembled = {
    view: assembledClick.view,
    paper: assembledClick.selectionText,
    ok: assembledClick.selected,
  };
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  report.readings.afterEscape = (await snap(page)).view;
  log('Esc 之后', report.readings.afterEscape);

  /* 3. 拆解各档 */
  const explode = {};
  for (const percent of [25, 50, 100]) {
    await setExplode(page, percent);
    const s = await snap(page);
    explode[percent] = {
      visibleMeshes: s.probe?.visibleMeshes,
      shellOpacity: s.probe?.shellOpacity,
      cameraDistance: s.probe?.camera?.distance,
      screen: s.probe?.screen,
      largestGroups: s.probe?.largestGroups?.slice(0, 4),
    };
    log(`拆解 ${percent}%`, {
      visible: explode[percent].visibleMeshes,
      shell: explode[percent].shellOpacity,
      cam: explode[percent].cameraDistance,
    });

    /* 拆解 50% 之后点心脏：证明「拆开之后仍可点选真实器官」 */
    if (percent === 50) {
      const heart = await clickGuarded(page, s.probe?.screen?.heart, '拆解 50% 后点心脏');
      report.readings.clickHeartAt50 = {
        view: heart.view,
        paper: heart.selectionText,
        ok: heart.selected,
      };
      await page.keyboard.press('Escape');
      await page.waitForTimeout(900);
    }
    /* 拆解 100% 之后点脾脏 */
    if (percent === 100) {
      const spleen = await clickGuarded(page, s.probe?.screen?.spleen, '拆解 100% 后点脾脏');
      report.readings.clickSpleenAt100 = {
        view: spleen.view,
        paper: spleen.selectionText,
        ok: spleen.selected,
      };
    }
  }
  report.readings.explode = explode;

  await page.locator('.bd-wb-stage__actions button').last().click();
  await page.waitForTimeout(1600);
  report.readings.afterReset = (await snap(page)).view;
  log('复位视角之后', report.readings.afterReset);

  /* 4. 器官页：聚焦 + 隔离 + 可深入入口 */
  for (const organ of ['brain', 'heart', 'spleen']) {
    await page.goto(`${BASE}/#/organ/${organ}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const s = await snap(page);
    report.readings[`organ_${organ}`] = {
      view: s.view,
      visibleMeshes: s.probe?.visibleMeshes,
      paperTitle: s.paperTitle,
      drillLinks: s.drillLinks,
    };
    log(`器官页 ${organ}`, report.readings[`organ_${organ}`]);

    const point = s.probe?.screen?.[organ === 'brain' ? 'cerebrum' : organ] ?? null;
    const after = await clickGuarded(page, point, `器官页 ${organ} 点选`);
    report.readings[`organ_${organ}_click`] = { view: after.view, paper: after.selectionText, ok: after.selected };
  }

  /* 5. 细胞页 + 大脑→神经元 */
  for (const cell of ['neuron', 'leukocyte']) {
    await page.goto(`${BASE}/#/cell/${cell}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    const s = await snap(page);
    report.readings[`cell_${cell}`] = { scale: s.scale, paperTitle: s.paperTitle };
    log(`细胞页 ${cell}`, report.readings[`cell_${cell}`]);
  }

  await page.goto(`${BASE}/#/organ/brain`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const neuronLink = page.locator('.bd-drill a', { hasText: '神经元' }).first();
  if (await neuronLink.count()) {
    await neuronLink.click();
    await page.waitForTimeout(2600);
    const after = await snap(page);
    report.readings.brainToNeuron = { scale: after.scale, url: page.url() };
    log('大脑 → 神经元', report.readings.brainToNeuron);
  }

  await page.goto(`${BASE}/#/organ/spleen`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  report.readings.spleenLinks = (await snap(page)).drillLinks;
  log('脾脏页可深入入口', report.readings.spleenLinks);

  /* 6. 关于页 */
  await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1400);
  report.readings.about = await page.evaluate(() => ({
    hasLicense: (document.body.textContent || '').includes('CC BY-SA 4.0'),
    hasDisclaimer: (document.body.textContent || '').includes('不构成医疗建议'),
    pageIndexRows: document.querySelectorAll('.bd-table tbody tr').length,
  }));
  log('关于页', report.readings.about);

  /* 7. 移动端 390×844 */
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mpage = await mobile.newPage();
  await mpage.goto(`${BASE}/#/body`, { waitUntil: 'domcontentloaded' });
  await mpage.waitForTimeout(4600);
  report.readings.mobile = await mpage.evaluate(() => {
    const rect = document.querySelector('.bd-wb-stage')?.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sheet: document.querySelector('.bd-wb-paper')?.getAttribute('data-sheet'),
      stage: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
    };
  });
  log('移动端', report.readings.mobile);
  const toggle = mpage.getByRole('button', { name: '查看知识' });
  if (await toggle.count()) {
    await toggle.click();
    await mpage.waitForTimeout(900);
    report.readings.mobileSheetOpen = await mpage.evaluate(
      () => document.querySelector('.bd-wb-paper')?.getAttribute('data-sheet'),
    );
  }
  await mobile.close();
} catch (error) {
  report.error = String((error && error.stack) || error);
  console.error('验收脚本失败：', error);
} finally {
  report.finishedAt = new Date().toISOString();
  writeFileSync(resolve(ROOT, 'delivery/test-evidence/verify-v2.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
