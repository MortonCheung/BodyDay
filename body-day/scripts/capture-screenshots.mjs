import { chromium } from 'playwright';

const OUT = '/Users/morton_cheung/Desktop/比赛/科普设计大赛/docs/screenshots';
const base = 'http://localhost:5173/#';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars'],
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const problems = [];
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`error: ${m.text().slice(0, 200)}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${String(e).slice(0, 200)}`));

const pages = [
  ['/', '01-cover', 2500],
  ['/guide', '02-guide', 2500],
  ['/body', '03-body', 45000],
  ['/systems/nervous-system', '04-system-nervous', 45000],
  ['/organ/brain', '05-organ-brain', 50000],
  ['/cell/neuron', '06-cell-neuron', 9000],
  ['/lesson/neural', '07-lesson-neural', 50000],
  ['/organ/spleen', '08-organ-spleen', 50000],
  ['/cell/leukocyte', '09-cell-leukocyte', 9000],
  ['/lesson/immune', '10-lesson-immune', 50000],
  ['/organ/heart', '11-organ-heart', 50000],
  ['/lesson/circulation', '12-lesson-circulation', 50000],
  ['/relations', '13-relations', 2500],
  ['/summary', '14-summary', 2500],
  ['/about', '15-about', 2500],
];

for (const [hash, file, wait] of pages) {
  await page.goto(`${base}${hash}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${file}.png`, timeout: 120000 });
  const info = await page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas').length,
    hotspots: document.querySelectorAll('.bd-hotspot').length,
    title: document.querySelector('h1')?.textContent ?? '',
    interactive: document.querySelectorAll('button, a[href]').length,
    fallback: document.querySelector('.bd-stage__canvas .bd-state__title')?.textContent ?? '',
  }));
  console.log(
    `${file.padEnd(26)} canvas=${info.canvases} hotspot=${info.hotspots} interactive=${info.interactive} fallback="${info.fallback}" h1="${info.title}"`,
  );
}

console.log('=== console problems ===');
console.log(problems.length ? [...new Set(problems)].slice(0, 10).join('\n') : '(none)');
await browser.close();
