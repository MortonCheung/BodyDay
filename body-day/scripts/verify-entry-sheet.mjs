import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 10/18 施工验收：入口同节点形变 + 五项顶栏 + 通用结构卡。
 *
 * 这三项是 10/18 手册的 P0，且都属于「只能靠真实浏览器才能确认」的交互，
 * 所以单独成一个可复跑的脚本（与 A–G 的 verify-v2.mjs 并列）。
 *
 * 运行：`BODYDAY_BASE_URL=http://localhost:5173 node body-day/scripts/verify-entry-sheet.mjs`
 * 前置：开发服务器可用；playwright 经 body-day/node_modules 软链可用。
 */

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.BODYDAY_BASE_URL ?? 'http://localhost:5173';
const SHOTS = resolve(ROOT, 'delivery/test-evidence/screenshots/1018-entry');
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
const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text().slice(0, 160));
});
page.on('pageerror', (error) => errors.push(String(error).slice(0, 160)));

const readPaper = () =>
  page.evaluate(() => {
    const paper = document.querySelector('.bd-wb-paper');
    return {
      titles: Array.from(paper?.querySelectorAll('.bd-title') ?? []).map((n) =>
        n.textContent.trim(),
      ),
      labels: Array.from(paper?.querySelectorAll('.bd-knowledge__fact dt') ?? []).map((n) =>
        n.textContent.trim(),
      ),
      values: Array.from(paper?.querySelectorAll('.bd-knowledge__fact dd') ?? []).map((n) =>
        n.textContent.trim(),
      ),
      text: paper?.textContent ?? '',
    };
  });

try {
  /* ---------------- 1. 入口：同一个节点的形变 ---------------- */
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.bd-entry__morph', { timeout: 15000 });

  /* 在节点上打一个标记，用来证明形变前后是同一个 DOM 元素 */
  await page.evaluate(() => {
    document.querySelector('.bd-entry__morph').dataset.identity = 'same-node';
  });

  const barBox = await page.locator('.bd-entry__morph').boundingBox();
  const controls = await page.locator('.bd-entry button, .bd-entry a, .bd-entry input').count();
  await page.screenshot({ path: `${SHOTS}/entry-loading.png` });

  await page.waitForSelector('.bd-entry__morph[data-ready="true"]', { timeout: 120000 });
  const duringMorph = await page.evaluate(() => ({
    disabled: document.querySelector('.bd-entry__morph').disabled,
    sameNode: document.querySelector('.bd-entry__morph').dataset.identity === 'same-node',
    box: (() => {
      const r = document.querySelector('.bd-entry__morph').getBoundingClientRect();
      return { width: Math.round(r.width), height: Math.round(r.height) };
    })(),
  }));

  await page.waitForSelector('.bd-entry__morph[data-settled="true"]', { timeout: 5000 });
  const settledBox = await page.locator('.bd-entry__morph').boundingBox();
  await page.screenshot({ path: `${SHOTS}/entry-button.png` });

  report.tests.entry = {
    controlCount: controls,
    barBox: barBox ? { width: Math.round(barBox.width), height: Math.round(barBox.height) } : null,
    sameNode: duringMorph.sameNode,
    disabledWhileMorphing: duringMorph.disabled,
    morphingBox: duringMorph.box,
    settledBox: settledBox
      ? { width: Math.round(settledBox.width), height: Math.round(settledBox.height) }
      : null,
  };
  log('1 入口同节点形变', report.tests.entry);

  /* ---------------- 2. 点击进入 → #/body + 五项顶栏 ---------------- */
  await page.locator('.bd-entry__morph').click();
  await page.waitForTimeout(1500);
  const nav = await page.locator('.bd-nav__item').allInnerTexts();
  report.tests.enter = {
    hash: await page.evaluate(() => location.hash),
    coverGone: (await page.locator('.bd-entry').count()) === 0,
    navItems: nav,
    navCount: nav.length,
  };
  log('2 进入与五项顶栏', report.tests.enter);

  await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
  await page.waitForTimeout(2600);
  const stageBox = await page.locator('.bd-wb-stage').boundingBox();

  /* ---------------- 3. 通用结构卡：点一个未登记的真实节点 ---------------- */
  /*
    体表外壳会先接住点击，而体表映射到「人体」实体卡。
    所以先滚轮把人体拆开一段（外壳按设计移到不可见集合），再点大腿区域的肌肉结构——
    那是图谱里真实存在、但本作品没有编写科普卡片的节点，正是通用卡的适用场景。
  */
  await page.mouse.move(stageBox.x + stageBox.width / 2, stageBox.y + stageBox.height / 2);
  for (let step = 0; step < 8; step += 1) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(2600);
  const exploded = await page.evaluate(
    () => window.__BODYDAY_STAGE__?.probe?.progress ?? null,
  );

  /* 10/18 加入左操作栏后舞台右移变窄，点击落点同步微调到中央偏下（实测命中真实小腿结构） */
  await page.mouse.click(stageBox.x + stageBox.width * 0.5, stageBox.y + stageBox.height * 0.75);
  await page.waitForTimeout(2200);
  const generic = await readPaper();
  report.tests.genericCard = {
    explodeProgress: exploded,
    titles: generic.titles,
    fields: generic.labels,
    values: generic.values,
    defensiveWording:
      /尚未编入|还没有独立科普卡片|不编造|不为局部细分|尚未建立独立科普卡片/.test(generic.text),
    /* 选中未登记结构时，不应再在下面挂一份「人体」总览 */
    bodyCardStillBelow: generic.values.some((v) => v.includes('组织层级')),
  };
  await page.screenshot({ path: `${SHOTS}/structure-card-generic.png` });
  log('3 未登记结构的通用卡', report.tests.genericCard);

  /* ---------------- 4. 大脑页点脑区：局部结构卡 + 上级结构 ---------------- */
  await page.goto(`${BASE}/#/organ/brain`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout: 120000 });
  await page.waitForTimeout(2600);
  const brainBox = await page.locator('.bd-wb-stage').boundingBox();
  await page.mouse.click(brainBox.x + brainBox.width * 0.5, brainBox.y + brainBox.height * 0.42);
  await page.waitForTimeout(2200);
  const part = await readPaper();
  report.tests.partCard = {
    titles: part.titles,
    fields: part.labels,
    values: part.values,
    defensiveWording: /尚未编入|还没有独立科普卡片|不编造/.test(part.text),
  };
  await page.screenshot({ path: `${SHOTS}/structure-card-part.png` });
  log('4 局部结构卡', report.tests.partCard);

  report.tests.consoleErrors = errors;
  log('5 控制台', { errors });
} finally {
  report.finishedAt = new Date().toISOString();
  const out = resolve(ROOT, 'delivery/test-evidence/verify-entry-sheet.json');
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`报告：${out}`);
  await context.close();
  await browser.close();
}
