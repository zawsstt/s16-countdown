import { chromium } from 'playwright';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'msedge', headless: false });

async function watch(mock, seconds, label) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
  await page.goto(`http://127.0.0.1:8091/?skipPreload=1&mockMinutes=${mock}`, { waitUntil: 'domcontentloaded' });
  await sleep(5000);

  const t0 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="promo-slot-timer"]');
    return el?.textContent?.trim() || null;
  });
  console.log(`\n【${label}】mock=${mock} 起始倒计时: ${t0}`);

  let triggered = false;
  let at = null;
  const start = Date.now();
  for (let i = 0; i < seconds; i += 5) {
    await sleep(5000);
    const on = await page.evaluate(() => !!document.querySelector('[data-testid="promo-video-slot-overlay"]'));
    if (on) { triggered = true; at = Math.round((Date.now() - start) / 1000); break; }
  }
  const t1 = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="promo-slot-timer"]');
    return el?.textContent?.trim() || null;
  });
  console.log(`  观察 ${seconds}s 后: 触发=${triggered}${at ? ` (第 ${at}s)` : ''} | 倒计时 ${t0} → ${t1}`);
  await page.close();
  return triggered;
}

// 30 分钟内：不应触发
await watch(25, 200, '30 分钟内（应抑制）');
await browser.close();
