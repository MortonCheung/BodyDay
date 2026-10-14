import { chromium } from 'playwright';

/**
 * 逐页验收截图：覆盖工作台的 11 个可直达页面。
 *
 * 关键技巧：除第一页外一律用**页内片段导航**（只改 hash）切换页面，
 * 这既避免每次重新加载整站，也顺带验证了作品的核心约束——
 * 切换页面时三维场景不会被卸载重建。
 */

const OUT = '/Users/morton_cheung/Desktop/比赛/科普设计大赛/docs/screenshots';
const base = 'http://localhost:5173/#';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`error: ${m.text().slice(0, 220)}`);
  if (m.type() === 'warning' && m.text().includes('[BodyDay]')) {
    problems.push(`warn: ${m.text().slice(0, 220)}`);
  }
});
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 220)}`));

const pages = [
  ['/body', '02-body', 30000],
  ['/systems/nervous-system', '03-system-nervous', 35000],
  ['/organ/brain', '06-organ-brain', 9000],
  ['/systems/cardiovascular-system', '04-system-cardiovascular', 35000],
  ['/organ/heart', '07-organ-heart', 9000],
  ['/systems/lymphatic-system', '05-system-lymphatic', 40000],
  ['/organ/spleen', '08-organ-spleen', 9000],
  ['/cell/neuron', '09-cell-neuron', 8000],
  ['/cell/leukocyte', '10-cell-leukocyte', 8000],
  ['/about', '11-about', 2000],
  // 封面单独最后抓：此时模型已在缓存中，欢迎层与三维场景能同框出现
  ['/body', '02-body', 1500],
  ['/', '01-cover', 1200],
];

let first = true;
for (const [hash, file, wait] of pages) {
  if (first) {
    await page.goto(`${base}${hash}`, { waitUntil: 'load', timeout: 60000 });
    first = false;
  } else {
    // 只改片段：不重新加载整站，三维场景保持挂载
    await page.evaluate((next) => {
      window.location.hash = next;
    }, hash);
  }
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${file}.png`, timeout: 120000 });
  const info = await page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas').length,
    hotspots: document.querySelectorAll('.bd-hotspot').length,
    railItems: document.querySelectorAll('.bd-wb-rail .bd-list__item').length,
    paperSections: document.querySelectorAll('.bd-wb-paper .bd-wb-section').length,
    clock: document.querySelector('.bd-clock')?.textContent?.trim() ?? '',
    h1: document.querySelector('h1')?.textContent ?? '',
    failing: document.querySelector('.bd-state__title')?.textContent ?? '',
    welcome: document.querySelector('.bd-welcome')?.getAttribute('data-open') ?? '',
  }));
  console.log(
    `${file.padEnd(24)} canvas=${info.canvases} hotspot=${info.hotspots} rail=${info.railItems} paper=${info.paperSections} clock="${info.clock}" welcome=${info.welcome} fail="${info.failing}" h1="${info.h1}"`,
  );
}

console.log('=== console problems ===');
console.log(problems.length ? [...new Set(problems)].slice(0, 12).join('\n') : '(none)');
await browser.close();
