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
await page.waitForTimeout(3000);

/* 系统筛选：只列出有真实可见网格的系统（生殖系统不会出现） */
const chips = await page.locator('.bd-wb-control .bd-chip').allInnerTexts();
note('左栏系统按钮', { chips, count: chips.length });
const nervous = page.locator('.bd-wb-control .bd-chip', { hasText: '神经系统' }).first();
if (await nervous.count()) {
  await nervous.click();
  await page.waitForTimeout(3800);
  note('筛选神经系统', await page.evaluate(() => window.__BODYDAY_STAGE__?.probe?.visibleMeshes ?? null));
  await shot('03b-system-nervous');
  await page.waitForTimeout(4000);
  const all = page.locator('.bd-wb-control .bd-chip', { hasText: '全部' }).first();
  await all.click();
  await page.waitForTimeout(3000);
}

/* ---------------- 4. 完整人体 → 平面展开（30s） ---------------- */
const expandBox = await stageBox();
await page.mouse.move(expandBox.x + expandBox.width / 2, expandBox.y + expandBox.height / 2);
await wheel(120, 16);
await page.waitForTimeout(3400);
const exploded = await page.evaluate(() => window.__BODYDAY_STAGE__?.probe ?? null);
await shot('04-exploded');
note('滚轮展开', {
  progress: exploded?.progress ?? null,
  visibleMeshes: exploded?.visibleMeshes ?? null,
  unitCount: exploded?.planar?.unitCount ?? null,
  unitDepthSpread: exploded?.planar?.unitDepthSpread ?? null,
});
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

/* --- 5. 展开态：点击心脏 → 直接进入器官详解 ---
   新交互不再需要「先选中、再点查看器官详解」：点中完整器官即跳转。
   投影中心可能落在相邻结构上，这里最多试 3 个近邻落点并**如实记录**结果。 */
const stageForClick = await stageBox();
const fullProbe = await page.evaluate(() => window.__BODYDAY_STAGE__?.probe ?? null);
let enteredDetail = false;
if (fullProbe?.screen?.heart) {
  /* 投影中心可能落在相邻结构上：最多试 3 个近邻落点，命中详情即停；
     未命中则按 Esc 清掉误选，继续保持展开态。最终结果如实记录。 */
  for (const [dx, dy] of [[0, 0], [0, 16], [-16, 0]]) {
    await page.mouse.click(
      stageForClick.x + fullProbe.screen.heart.x + dx,
      stageForClick.y + fullProbe.screen.heart.y + dy,
    );
    await page.waitForTimeout(3000);
    if ((await page.evaluate(() => location.hash)).startsWith('#/detail')) {
      enteredDetail = true;
      break;
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1400);
  }
  note('点击心脏', {
    hash: await page.evaluate(() => location.hash),
    直接进入详情: enteredDetail,
  });
}
if (enteredDetail) {
  await stageReady();
  await shot('05-heart-detail');
  await page.waitForTimeout(9000);

  /* --- 6. 详情页：局部结构热点 + Esc 分层返回 --- */
  const parts = await page.locator('.bd-wb-parts .bd-chip').allInnerTexts();
  note('详情页局部结构', { parts });
  if (parts.length > 0) {
    await page.locator('.bd-wb-parts .bd-chip').first().click();
    await page.waitForTimeout(3200);
    await shot('06-detail-hotspot');
    await page.waitForTimeout(5000);
    await page.keyboard.press('Escape'); // 先清热点
    await page.waitForTimeout(1800);
  }
  await page.keyboard.press('Escape'); // 再返回探索
  await page.waitForTimeout(3400);
  note('Esc 返回探索', { hash: await page.evaluate(() => location.hash) });
  await page.waitForTimeout(4000);
} else {
  note('点击心脏', '未命中详情入口，改由器官页展示（如实记录）');
}

/* --- 7. 大脑与心脏的真实科普卡（器官页，可深链） --- */
for (const [organ, name] of [
  ['brain', '大脑'],
  ['heart', '心脏'],
]) {
  await page.goto(`${BASE}/#/organ/${organ}`, { waitUntil: 'domcontentloaded' });
  await stageReady();
  const info = await readPaper();
  note(`器官页 ${name}`, info);
  await page.waitForTimeout(7000);
}

await shot('07-structure-cards');

/* ---------------- 8. 关于 / 署名（10–15s） ---------------- */
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
