import { chromium } from '@playwright/test';
const [,, file, out, w = '1400', h = '1600'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto(file.startsWith('http') ? file : 'file://' + file);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
