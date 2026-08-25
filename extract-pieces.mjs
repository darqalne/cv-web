import sharp from 'sharp';
import fs from 'node:fs';

const SRC = 'docs/logo1.png';
const OUT_DIR = 'docs/pieces';
fs.mkdirSync(OUT_DIR, { recursive: true });

const W = 1536, H = 1024;
const cols = 4, rows = 3;
const cellW = W / cols;
const cellH = H / rows;

const names = [
  'baret', 'binalar-merkez-yakin', 'binalar-yan-uzak', 'kayalik',
  'maden-girisi', 'gaz-lambasi', 'lambanin-isigi', 'isik-huzmeleri',
  'kazma', 'balyoz', 'cember', 'kenar-siluetleri',
];

const labelSkipPx = 80;
const inset = 30;
// per-index (0-based) extra crop to remove faint neighbor bleed on wide/edge cells
const extraInset = {
  10: { left: -22, right: 70 }, // cember: ring nearly fills its cell; give it back some room
};
const TINT = { r: 237, g: 230, b: 214 }; // paper color

const manifest = {};

for (let i = 0; i < 12; i++) {
  const row = Math.floor(i / cols);
  const col = i % cols;
  const extra = extraInset[i] || {};
  const left = Math.round(col * cellW) + inset + (extra.left || 0);
  const top = Math.round(row * cellH) + labelSkipPx + (extra.top || 0);
  const width = Math.round(cellW) - inset * 2 - (extra.left || 0) - (extra.right || 0);
  const height = Math.round(cellH) - labelSkipPx - inset - (extra.top || 0);

  const cellBuf = await sharp(SRC).extract({ left, top, width, height }).toBuffer();

  // Build a single-channel alpha mask from the black linework: black -> opaque, white -> transparent.
  const maskRaw = await sharp(cellBuf)
    .greyscale()
    .negate()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rgbBase = await sharp({
    create: { width, height, channels: 3, background: TINT },
  }).raw().toBuffer();

  const composed = await sharp(rgbBase, { raw: { width, height, channels: 3 } })
    .joinChannel(maskRaw.data, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();

  const name = `${String(i + 1).padStart(2, '0')}-${names[i]}`;
  const outPath = `${OUT_DIR}/${name}.png`;

  await sharp(composed).trim({ threshold: 10 }).toFile(outPath);
  const meta = await sharp(outPath).metadata();

  manifest[names[i]] = { file: `${name}.png`, width: meta.width, height: meta.height };
  console.log(name, meta.width, 'x', meta.height);
}

fs.writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2));

// clean up raw debug cells
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.startsWith('_raw-')) fs.unlinkSync(`${OUT_DIR}/${f}`);
}
