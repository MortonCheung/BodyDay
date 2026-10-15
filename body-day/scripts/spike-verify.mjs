import fs from 'node:fs';
import { chromium } from 'playwright';

/**
 * 整具人体拆解舞台 · 真实浏览器取证（临时脚本，C2）。
 *
 * 只用真实运行结果说话：真实加载统计、真实位移前后坐标、真实点选回读、真实帧率。
 * 软件渲染（SwiftShader）环境，不代表真实 GPU 帧率。
 */

const OUT = '/tmp/spike';
const URL = 'http://localhost:5175/#/spike-full-body';
const ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ARGS });
const context = await browser.newContext({
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.setDefaultTimeout(300000);

const consoleMessages = [];
const pageErrors = [];
page.on('console', (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
page.on('pageerror', (error) => pageErrors.push(String(error)));

const spike = (fn, arg) => page.evaluate(fn, arg);
const readProbe = () => page.evaluate(() => window.__BODYDAY_SPIKE__.probe);
const text = (testId) => page.locator(`[data-testid="${testId}"]`).innerText();

/** 等若干真实渲染帧：frameloop="always" 下，浏览器 rAF 与舞台渲染同频。 */
const frames = (n) =>
  page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let seen = 0;
        const tick = () => {
          seen += 1;
          if (seen >= count) resolve(seen);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    n,
  );

console.log('[1] 打开页面', URL);
await page.goto(URL, { waitUntil: 'domcontentloaded' });

console.log('[2] 等待「装配完成 + 首个有效帧」……');
await page.waitForFunction(() => Boolean(window.__BODYDAY_SPIKE__?.stats), null, { timeout: 300000 });

const stats = await spike(() => window.__BODYDAY_SPIKE__.stats);
console.log('[3] 真实加载统计：');
console.log(JSON.stringify(stats, null, 2));
console.log('    页面 DOM 复核：');
for (const id of [
  'stat-unique',
  'stat-nodes',
  'stat-mesh',
  'stat-triangles',
  'stat-loadms',
  'stat-sample-id',
  'stat-sample-parent',
  'stat-sample-system',
  'stat-userdata-keys',
  'group-heart',
  'group-cerebrum',
  'group-cerebellum',
  'group-brainstem',
  'group-spleen',
]) {
  console.log(`      ${id} = ${await text(id)}`);
}

const stage = page.locator('.bd-stage');
const stageBox = await stage.boundingBox();
console.log('[4] 舞台元素尺寸：', JSON.stringify(stageBox));

/** 设定 progress 并等到真实读数与真实帧都到位。 */
async function setProgress(value) {
  await spike((v) => window.__BODYDAY_SPIKE__.setProgress(v), value);
  await page.waitForFunction(
    (v) => window.__BODYDAY_SPIKE__.probe && Math.abs(window.__BODYDAY_SPIKE__.probe.progress - v) < 1e-6,
    value,
  );
  await frames(3);
  await sleep(400);
}

await setProgress(0);
const probe0 = await readProbe();
await stage.screenshot({ path: `${OUT}/00-assembled.png` });
console.log('[5] progress=0 · 位移读数：', JSON.stringify(probe0.centers));

await setProgress(0.5);
const probe50 = await readProbe();
await stage.screenshot({ path: `${OUT}/01-partial.png` });

await setProgress(1);
const probe100 = await readProbe();
await stage.screenshot({ path: `${OUT}/02-exploded.png` });

console.log('[6] 位移前后真实坐标差（世界包围盒中心，progress 0 → 1）：');
const deltas = {};
for (const id of Object.keys(probe0.centers)) {
  const a = probe0.centers[id];
  const b = probe100.centers[id];
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const mag = Math.hypot(d[0], d[1], d[2]);
  deltas[id] = { from: a, to: b, delta: d, magnitude: mag };
  console.log(
    `      ${id}: ${a.map((n) => n.toFixed(5)).join(',')} → ${b.map((n) => n.toFixed(5)).join(',')} ` +
      `| Δ=(${d.map((n) => n.toFixed(5)).join(', ')}) |Δ|=${mag.toFixed(5)}`,
  );
}
console.log(
  '      0.5 时（部分拆解）读数：',
  JSON.stringify(probe50.centers),
);
console.log('[6b] 镜头真实读数：progress0 =', JSON.stringify(probe0.camera), ' progress1 =', JSON.stringify(probe100.camera));
console.log('[6c] 半径最大的可位移组（progress=1）：');
for (const group of probe100.largestGroups) {
  console.log(
    `      id=${group.id} radius=${group.radius.toFixed(5)} offsetMagnitude=${group.offsetMagnitude.toFixed(5)} meshCount=${group.meshCount}`,
  );
}

// 真实点选：回到组装态，点击舞台中心
await setProgress(0);
await sleep(600);
const center = { x: stageBox.x + stageBox.width / 2, y: stageBox.y + stageBox.height / 2 };
console.log('[7] 点击舞台中心：', JSON.stringify(center));
// 悬停：先移出再移入，确保 R3F 收到 pointerover
await page.mouse.move(center.x - 30, center.y - 30);
await sleep(300);
await page.mouse.move(center.x, center.y);
await sleep(900);
const hoveredAfterMove = await spike(() => window.__BODYDAY_SPIKE__.hoveredId);
const hoveredDom = await text('hovered-id');
await page.mouse.click(center.x, center.y);
await sleep(600);
const selectedAfterClick = await spike(() => window.__BODYDAY_SPIKE__.selectedId);

const attempts = [];
if (!selectedAfterClick) {
  for (const [dx, dy] of [[0, -60], [0, 60], [40, 0], [-40, 0], [0, -120], [0, -180]]) {
    await page.mouse.click(center.x + dx, center.y + dy);
    await sleep(500);
    const hit = await spike(() => window.__BODYDAY_SPIKE__.selectedId);
    attempts.push({ offset: [dx, dy], hit });
    if (hit) break;
  }
}
console.log('      悬停命中：', hoveredAfterMove ?? '（空）', '| DOM:', hoveredDom);
console.log('      点选回读 selectedId =', selectedAfterClick ?? '（空）');
if (attempts.length) console.log('      备选点命中记录：', JSON.stringify(attempts));
console.log('      页面 DOM 复核 selected =', await text('selected-id'));

// 聚焦心脏 + 隔离：进入器官状态的取证
console.log('[8] 聚焦心脏并隔离……');
await spike(() => window.__BODYDAY_SPIKE__.setIsolate(true));
await spike(() => window.__BODYDAY_SPIKE__.focus('heart'));
await frames(3);
await sleep(3000);
await frames(3);
await stage.screenshot({ path: `${OUT}/03-focus-heart.png` });
const selectedFocus = await spike(() => window.__BODYDAY_SPIKE__.selectedId);

// 复位：先把指针移出画布（清掉悬停高亮），这样复位截图才可与装配态逐像素对比
await page.mouse.move(5, 20);
await sleep(700);
await spike(() => window.__BODYDAY_SPIKE__.setIsolate(false));
await spike(() => window.__BODYDAY_SPIKE__.reset());
await frames(3);
await sleep(3000);
await frames(3);
await stage.screenshot({ path: `${OUT}/04-reset.png` });
const selectedReset = await spike(() => window.__BODYDAY_SPIKE__.selectedId);
const hoveredReset = await spike(() => window.__BODYDAY_SPIKE__.hoveredId);
const probeReset = await readProbe();
console.log(
  '      聚焦后 selectedId =',
  selectedFocus ?? '（空）',
  '| 复位后 selectedId =',
  selectedReset ?? '（空）',
  '| 复位后 hoveredId =',
  hoveredReset ?? '（空）',
);
console.log('      复位后 heart 中心 =', JSON.stringify(probeReset.centers?.heart));

// 帧率：软件渲染下的真实 rAF 计数
console.log('[9] 软件渲染下帧率（rAF 计数 2 秒）……');
const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let count = 0;
      const start = performance.now();
      const tick = () => {
        count += 1;
        const elapsed = performance.now() - start;
        if (elapsed >= 2000) resolve({ frames: count, ms: Math.round(elapsed), fps: (count / elapsed) * 1000 });
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }),
);
console.log('      ', JSON.stringify(fps));

// 控制台：WebGL 错误 / 警告
const suspicious = consoleMessages.filter((m) =>
  /webgl|glb|three|error|warn|fail|context/i.test(m.text) || m.type === 'error' || m.type === 'warning',
);
console.log('[10] 控制台：总', consoleMessages.length, '条；其中可疑/错误/警告', suspicious.length, '条');
for (const m of suspicious.slice(0, 40)) console.log(`      [${m.type}] ${m.text}`);
console.log('      pageerror:', pageErrors.length, pageErrors.slice(0, 10));

const report = {
  stats,
  probe0: probe0.centers,
  probe50: probe50.centers,
  probe100: probe100.centers,
  deltas,
  camera: { progress0: probe0.camera, progress1: probe100.camera },
  largestGroups: probe100.largestGroups,
  hoveredAfterMove,
  hoveredDom,
  selectedAfterClick,
  attempts,
  selectedFocus,
  selectedReset,
  hoveredReset,
  probeReset: probeReset.centers,
  fps,
  suspicious,
  pageErrors,
};
fs.writeFileSync(`${OUT}/verify.json`, JSON.stringify(report, null, 2));
console.log('[11] 已写入', `${OUT}/verify.json`);

await browser.close();
