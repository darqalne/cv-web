import puppeteer from 'puppeteer';

const url = process.argv[2] || 'http://localhost:3000';
const scrollFrac = process.argv[3] !== undefined ? parseFloat(process.argv[3]) : null;
const label = process.argv[4] || (scrollFrac !== null ? `p${scrollFrac}` : 'shot');

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
await new Promise((r) => setTimeout(r, 700));

if (scrollFrac !== null) {
  // scrollHeight can keep shifting slightly as late layout settles; require two stable reads in a row
  let lastMax = -1;
  let stableCount = 0;
  for (let i = 0; i < 12 && stableCount < 2; i++) {
    const max = await page.evaluate((f) => {
      const m = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, m * f);
      return m;
    }, scrollFrac);
    await new Promise((r) => setTimeout(r, 200));
    stableCount = Math.abs(max - lastMax) < 1 ? stableCount + 1 : 0;
    lastMax = max;
  }
  await new Promise((r) => setTimeout(r, 200));
}

const outDir = 'temporary screenshots';
const fs = await import('node:fs');
const files = fs.readdirSync(outDir).filter((f) => f.startsWith('screenshot-'));
const nums = files.map((f) => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0', 10));
const next = (nums.length ? Math.max(...nums) : 0) + 1;
const outPath = `${outDir}/screenshot-${next}-${label}.png`;

await page.screenshot({ path: outPath });
console.log(outPath);
await browser.close();
