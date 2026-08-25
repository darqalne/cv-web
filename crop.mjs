import puppeteer from 'puppeteer';

const frac = parseFloat(process.argv[2] || '1');
const label = process.argv[3] || `crop-p${frac}`;

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
await new Promise((r) => setTimeout(r, 700));

let lastMax = -1;
let stable = 0;
for (let i = 0; i < 12 && stable < 2; i++) {
  const max = await page.evaluate((f) => {
    const m = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, m * f);
    return m;
  }, frac);
  await new Promise((r) => setTimeout(r, 200));
  stable = Math.abs(max - lastMax) < 1 ? stable + 1 : 0;
  lastMax = max;
}
await new Promise((r) => setTimeout(r, 200));

const handle = await page.$('#logo-anim-wrap');
await handle.screenshot({ path: `temporary screenshots/${label}.png` });
console.log(`temporary screenshots/${label}.png`);
await browser.close();
