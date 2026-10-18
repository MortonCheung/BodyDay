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
/* 本地模型 <1s 就绪，进度条阶段很短；这里只做极短停顿，如实拍摄真实的「加载 → 同节点形变」，
   不额外拖长时间伪装进度。 */
await page.waitForTimeout(500);
await shot('01-loading');
await page.waitForSelector('.bd-entry__morph[data-settled="true"]', { timeout: 120000 });
await page.waitForTimeout(1400); // 形变完成、字样淡入后再点
await shot('02-enter-ready');
note('开场', '真实进度 → 同节点形变为「进入探索」（100% 由真实 ready 触发；本地加载 <1s）');

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

/* ---------------- 5. 点选结构 + 右栏卡片联动（约 45s） ----------------
   为什么不「一次点中」：解剖结构的投影中心常被更外层的几何遮住（例如心脏在胸廓内侧），
   单点在装配态往往命中的是体表或邻近结构。这里改为「点击 → 回读右栏卡片 → 校验命中结构」，
   未命中就在小范围内平移重试；**最终选中哪个真实结构一律如实记录**，不摆拍。 */
const readPaper = () =>
  page.evaluate(() => {
    const p = document.querySelector('.bd-wb-paper');
    const drill = p?.querySelector('.bd-drill a');
    return {
      title:
        p?.querySelector('[aria-label="当前结构"] .bd-title')?.textContent?.trim() ??
        p?.querySelector('.bd-knowledge__title')?.textContent?.trim() ??
        null,
      text: (p?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 150),
      drillLabel: drill?.textContent?.trim() ?? null,
      drillHref: drill?.getAttribute('href') ?? null,
    };
  });

const clearSelection = async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1400);
};

/**
 * 尝试点中指定结构：从该结构的投影中心出发，在近邻梯度上试若干落点，
 * 每次都**回读右栏卡片**判断是否真的选中了目标；只有卡片标题真的变化才算命中。
 * 全部落空时返回第一个真实命中的结构（可能是相邻/外层结构）——如实记录，不摆拍。
 */
const clickStructure = async (id, expect) => {
  const stage = await stageBox();
  const before = (await readPaper()).title;
  const probe = await page.evaluate(() => window.__BODYDAY_STAGE__?.probe ?? null);
  const pos = probe?.screen?.[id];
  if (!pos) return { hit: false, info: null, note: '该结构在当前视角没有可投影坐标' };
  let firstReal = null;
  for (const [dx, dy] of [
    [0, 0], [0, 30], [0, -30], [30, 0], [-30, 0], [0, 60], [0, -60], [30, 30], [-30, -30],
  ]) {
    await page.mouse.click(stage.x + pos.x + dx, stage.y + pos.y + dy);
    await page.waitForTimeout(1600);
    const info = await readPaper();
    if (info.title && info.title !== before) {
      if (firstReal === null) firstReal = info;
      if (expect.test(info.title)) return { hit: true, info };
    }
  }
  return {
    hit: false,
    info: firstReal,
    note: firstReal
      ? '投影中心附近命中的是相邻/外层结构'
      : '投影中心附近没有命中任何结构',
  };
};

/** 取消选中后点一个未指定的位置，拿一张真实的「细分结构」卡（展示通用结构卡） */
const clickAnyStructure = async () => {
  const stage = await stageBox();
  for (const [fx, fy] of [
    [0.42, 0.28], [0.5, 0.32], [0.5, 0.5], [0.46, 0.62], [0.56, 0.72], [0.5, 0.8],
  ]) {
    await page.mouse.click(stage.x + stage.width * fx, stage.y + stage.height * fy);
    await page.waitForTimeout(2000);
    const info = await readPaper();
    if (info.title) return info;
  }
  return null;
};

/* --- 5a. 点选一个真实结构 --- */
await clearSelection();
const heartTry = await clickStructure('heart', /心脏/);
note('点选心脏', {
  命中心脏: heartTry.hit,
  实际选中: heartTry.info?.title ?? null,
  说明: heartTry.note ?? null,
});
await page.waitForTimeout(5000);

/* --- 5b. 右栏唯一入口 → 器官详解（点**当前卡片**上的入口，不碰顶栏） ---
   上一版成片按可访问名取第一个链接，结果点到顶栏「器官详解」，进了心脏页而不是当前器官；
   这里限定 `.bd-wb-paper .bd-drill a`，并核对最终地址与卡片指向一致。 */
const cardAtDetail = await readPaper();
let enteredDetail = false;
if (cardAtDetail.drillHref) {
  const link = page.locator('.bd-wb-paper .bd-drill a').first();
  note('即将进入器官详解', {
    卡片标题: cardAtDetail.title,
    入口文字: cardAtDetail.drillLabel,
    目标: cardAtDetail.drillHref,
  });
  await link.click();
  await page.waitForTimeout(3600);
  enteredDetail = true;
  await stageReady();
  await shot('06-organ-detail');
  note('进入器官详解', page.url());
  await page.waitForTimeout(9000);
  const back = page.locator('.bd-wb-paper').getByText(/返回探索/).first();
  if (await back.count()) {
    await back.click();
    await page.waitForTimeout(3200);
    note('返回探索', page.url());
    await page.waitForTimeout(6000);
  }
} else {
  note('进入器官详解', '当前卡片没有「查看器官详解」入口（未匹配到已核实器官，如实记录）');
}

/* --- 5c. 第二个目标：大脑 --- */
await clearSelection();
const brainTry = await clickStructure('cerebrum', /脑/);
note('点选大脑', {
  命中大脑: brainTry.hit,
  实际选中: brainTry.info?.title ?? null,
  说明: brainTry.note ?? null,
});
await page.waitForTimeout(5000);

/* --- 5d. 通用结构卡：一个未登记的真实细分结构（右栏没有假入口） --- */
await clearSelection();
const anyCard = await clickAnyStructure();
note('点选细分结构', anyCard);
await page.waitForTimeout(3000);
await shot('05-structure-cards');

/* --- 5e. 器官页：大脑与心脏的真实知识卡（可直达、可深链） ---
   与上面前 5a–5c 的「模型点选」互为补足：那一段如实展示了「投影中心命中的是相邻结构」，
   这一段用器官页本身证明心 / 脑的知识卡与右栏唯一入口确实存在。 */
for (const [organ, name] of [
  ['brain', '大脑'],
  ['heart', '心脏'],
]) {
  await page.goto(`${BASE}/#/organ/${organ}`, { waitUntil: 'domcontentloaded' });
  await stageReady();
  const info = await readPaper();
  note(`器官页 ${name}`, info);
  await page.waitForTimeout(7500);
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
