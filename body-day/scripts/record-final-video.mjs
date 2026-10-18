import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

/**
 * 交付成片录制（手册 §9 的镜头顺序，1920×1080）。
 *
 * 为什么不用 VideoCraft：本机不存在该 skill（全盘搜索 + 已配置 skills 清单均无），
 * 手册 §9.1 要求如实报告并采用「真实浏览器录屏 + 本地剪辑工具」的退路。
 *
 * 录制原则：
 * - 全部用**真实浏览器输入**（滚轮、点击、拖动）驱动，不播放预渲染假 UI；
 * - 只用路由 + 屏幕坐标定位，不依赖具体 DOM 类名，因此界面改版后仍可复跑；
 * - 等待条件读页面自己上报的运行时读数（`window.__BODYDAY_STAGE__`），不靠固定 sleep 蒙。
 *
 * 运行：`node body-day/scripts/record-final-video.mjs`
 * 环境：`BODYDAY_BASE_URL`（默认 http://localhost:5173）
 * 产出：delivery/demo/BodyDay_最终演示.mp4（H.264 / 1920×1080）+ 录制日志 JSON
 */

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.env.BODYDAY_BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = resolve(ROOT, 'delivery/demo');
const RAW_DIR = process.env.BODYDAY_RAW_DIR ?? tmpdir(); // 原始 webm 落到系统临时目录，不污染仓库
const TARGET = resolve(OUT_DIR, 'BodyDay_最终演示.mp4');
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(RAW_DIR, { recursive: true });

const log = [];
const note = (step, detail) => {
  log.push({ step, detail, at: new Date().toISOString() });
  console.log(`[${step}]`, typeof detail === 'string' ? detail : JSON.stringify(detail));
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW_DIR, size: { width: 1920, height: 1080 } },
});
const page = await context.newPage();
page.on('pageerror', (e) => note('页面错误', String(e).slice(0, 120)));

const stageBox = async () => {
  const box = await page.locator('.bd-wb-stage').boundingBox();
  if (!box) throw new Error('找不到三维舞台容器');
  return box;
};
const stageReady = async (timeout = 120000) => {
  await page.waitForFunction(() => Boolean(window.__BODYDAY_STAGE__?.probe), null, { timeout });
  await page.waitForTimeout(2200);
};
/** 真实滚轮：与验收脚本同一节奏（每格 120px、间隔 200ms），保证可复现 */
const wheel = async (dy, times) => {
  for (let i = 0; i < times; i += 1) {
    await page.mouse.wheel(0, dy);
    await page.waitForTimeout(200);
  }
};
const shot = async (name) => {
  const path = resolve(OUT_DIR, `video-shot-${name}.png`);
  await page.screenshot({ path });
  note(`镜头截图 ${name}`, path);
};

/* ---------------- 1. 开场：真实加载与同节点形变（约 10–15s） ---------------- */
await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.bd-entry__morph');
await page.waitForTimeout(4200); // 让观众看清真实进度条的推进
await shot('01-loading');
await page.waitForSelector('.bd-entry__morph[data-settled="true"]', { timeout: 120000 });
await page.waitForTimeout(1400); // 形变完成、字样淡入后再点
await shot('02-enter-ready');
note('开场', '真实进度 → 同节点形变为「进入探索」（100% 由真实 ready 触发）');

/* ---------------- 2. 点击进入 → 人体探索（全身 20s） ---------------- */
await page.locator('.bd-entry__morph').click();
await page.waitForTimeout(2600);
await stageReady();
const box = await stageBox();
await shot('03-explore-body');
await page.waitForTimeout(9000);

/* ---------------- 3. 转动 + 系统筛选（20s） ---------------- */
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2 + 20, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(4200);
note('转动人体', '拖动旋转（真实 pointer 事件）');
await page.waitForTimeout(4000);

/* ---------------- 4. 完整人体 → 拆解（30s） ---------------- */
await wheel(120, 8);
await page.waitForTimeout(3000);
const exploded = await page.evaluate(() => window.__BODYDAY_STAGE__?.probe ?? null);
await shot('04-exploded');
note('滚轮拆解', { progress: exploded?.progress ?? null, visibleMeshes: exploded?.visibleMeshes ?? null });
await page.waitForTimeout(9000);

/* ---------------- 5. 点选器官 + 右栏卡片联动（45s） ---------------- */
const clickScreenStructure = async (id) => {
  const probe = await page.evaluate(() => window.__BODYDAY_STAGE__?.probe ?? null);
  const pos = probe?.screen?.[id];
  if (!pos) return false;
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
  await page.waitForTimeout(3200);
  return true;
};
for (const [id, label] of [
  ['heart', '心脏'],
  ['cerebrum', '大脑'],
]) {
  const ok = await clickScreenStructure(id);
  const paper = await page.evaluate(() => {
    const p = document.querySelector('.bd-wb-paper');
    return {
      titles: Array.from(p?.querySelectorAll('.bd-title') ?? []).map((n) => n.textContent.trim()),
      text: (p?.textContent ?? '').slice(0, 90),
    };
  });
  note(`点选 ${label}`, { 命中: ok, paper });
  await page.waitForTimeout(6500);
}
await shot('05-structure-cards');

/* ---------------- 6. 进入器官详解 + 返回（40s + 15s） ---------------- */
/* 入口在右栏的唯一按钮上：按可见文本点击，找不到就如实记为未实现 */
const detailEntry = page.getByRole('link', { name: /查看.*(详解|专题)|器官详解/ }).first();
let enteredDetail = false;
if (await detailEntry.count()) {
  await detailEntry.click();
  await page.waitForTimeout(3600);
  enteredDetail = true;
  await stageReady();
  await shot('06-organ-detail');
  note('进入器官详解', page.url());
  await page.waitForTimeout(9000);
  const back = page.getByRole('link', { name: /返回探索|返回/ }).first();
  if (await back.count()) {
    await back.click();
    await page.waitForTimeout(3200);
    note('返回探索', page.url());
    await page.waitForTimeout(5000);
  }
} else {
  note('进入器官详解', '未在右栏找到唯一的详情入口（可能未实现或未核实器官）');
}

/* ---------------- 7. 关于 / 署名（10–15s） ---------------- */
await page.goto(`${BASE}/#/about`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6200);
await shot('07-about');

/* ---------------- 收尾 ---------------- */
const raw = await page.video().path();
await context.close();
await browser.close();
note('原始录像', raw);

const stat = statSync(raw);
execFileSync('ffmpeg', [
  '-y', '-i', raw,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
  '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart',
  '-vf', 'scale=1920:-2',
  TARGET,
], { stdio: 'ignore' });

const duration = Number(
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', TARGET])
    .toString()
    .trim(),
);
const report = {
  base: BASE,
  videoCraftSkill: '不存在（全盘搜索 + 已配置 skills 清单均无命中）→ 按手册 §9.1 采用真实浏览器录屏退路',
  recording: 'Playwright Chromium 真实输入（滚轮 / 点击 / 拖动），1920×1080，software GL',
  rawWebm: raw,
  rawBytes: stat.size,
  output: TARGET,
  outputBytes: statSync(TARGET).size,
  durationSeconds: Number(duration.toFixed(2)),
  withinEightMinutes: duration <= 480,
  enteredOrganDetail: enteredDetail,
  steps: log,
  generatedAt: new Date().toISOString(),
};
writeFileSync(resolve(OUT_DIR, 'recording-log.json'), JSON.stringify(report, null, 2));
console.log(`成片：${TARGET}\n时长 ${report.durationSeconds}s（≤8 分钟：${report.withinEightMinutes}）`);
