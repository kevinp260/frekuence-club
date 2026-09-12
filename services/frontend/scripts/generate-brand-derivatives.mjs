import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(root, 'public');
const font = await readFile(join(root, 'src/assets/fonts/Montserrat-Variable-latin.woff2'));
const symbol = await readFile(join(root, 'src/assets/brand/temporary/frekuence-symbol-white.png'));
const pattern = await readFile(
  join(root, 'src/assets/brand/temporary/cymatic-rings-white-on-black.png'),
);
const fontUrl = `data:font/woff2;base64,${font.toString('base64')}`;
const symbolUrl = `data:image/png;base64,${symbol.toString('base64')}`;
const patternUrl = `data:image/png;base64,${pattern.toString('base64')}`;

await mkdir(join(outputRoot, 'favicons'), { recursive: true });
await mkdir(join(outputRoot, 'og'), { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
  headless: true,
});

try {
  const renderIcon = async (size, filename) => {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`
      <style>
        * { box-sizing: border-box; }
        html, body { width: 100%; height: 100%; margin: 0; background: #000; }
        body { display: grid; place-items: center; }
        img { width: 82%; height: 82%; object-fit: contain; }
      </style>
      <img src="${symbolUrl}" alt="">
    `);
    await page.screenshot({ path: join(outputRoot, 'favicons', filename) });
    await page.close();
  };

  await renderIcon(32, 'favicon-32.png');
  await renderIcon(180, 'apple-touch-icon.png');
  await renderIcon(192, 'icon-192.png');
  await renderIcon(512, 'icon-512.png');

  const social = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await social.setContent(`
    <style>
      @font-face {
        font-family: Montserrat;
        src: url('${fontUrl}') format('woff2');
        font-weight: 400 900;
      }
      * { box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; margin: 0; overflow: hidden; }
      body {
        position: relative;
        display: grid;
        grid-template-columns: 1.25fr .75fr;
        padding: 52px;
        background: #000;
        color: #fff;
        font-family: Montserrat, sans-serif;
        border: 1px solid #404040;
      }
      .pattern {
        position: absolute;
        right: -75px;
        bottom: -70px;
        width: 690px;
        opacity: .25;
      }
      .copy { position: relative; z-index: 1; display: flex; flex-direction: column; }
      .name { margin: 0; color: #ff0101; font-size: 22px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: auto 0 22px; font-size: 112px; line-height: .78; letter-spacing: -.085em; text-transform: uppercase; }
      .location { margin: 0; color: #a7a6b4; font-size: 22px; font-weight: 600; }
      .side { position: relative; z-index: 1; display: flex; align-items: flex-end; justify-content: flex-end; }
      .symbol { width: 245px; height: 245px; object-fit: contain; }
      .calibration { position: absolute; top: 4px; right: 0; margin: 0; font-size: 15px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
    </style>
    <img class="pattern" src="${patternUrl}" alt="">
    <section class="copy">
      <p class="name">Frekuence Club / Tirana</p>
      <h1>Human<br>Hz</h1>
      <p class="location">Under a lighthouse, in a basement.</p>
    </section>
    <aside class="side">
      <p class="calibration">Club calibrated at 7.83 Hz</p>
      <img class="symbol" src="${symbolUrl}" alt="">
    </aside>
  `);
  await social.screenshot({ path: join(outputRoot, 'og', 'frekuence-club.jpg'), quality: 90 });
  await social.close();
} finally {
  await browser.close();
}
