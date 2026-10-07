// npm install --prefix /tmp/che-seo-tools playwright
// PLAYWRIGHT_MODULE=/tmp/che-seo-tools/node_modules/playwright/index.mjs node scripts/check-browser.mjs
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const origin = process.env.SITE_ORIGIN || 'http://127.0.0.1:8766';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
let requests = 0;
try {
  const context = await browser.newContext();
  // Stub only the remote analytics service; test the real consent and event code.
  await context.route('https://mc.yandex.ru/**', async (route) => {
    requests++;
    await route.fulfill({ contentType: 'application/javascript', body: 'window.__ymCalls = []; window.ym = (...args) => window.__ymCalls.push(args);' });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin);
  await page.locator('#cookie-banner').waitFor({ state: 'visible' });
  assert.equal(requests, 0, 'Analytics loaded before consent');
  await page.locator('[data-cookie="no"]').click();
  assert.equal(requests, 0, 'Analytics loaded after rejection');

  const ids = await page.locator('[data-cat]').evaluateAll((nodes) => nodes.map((node) => node.dataset.cat));
  assert.equal(ids.length, 9);
  assert.equal(await page.locator('[data-category]').count(), 9);
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ids) {
      await page.locator(`[data-cat="${id}"]`).click();
      assert.equal(await page.locator('[data-category]:visible').count(), 1);
      assert.equal(await page.locator(`[data-category="${id}"]`).isVisible(), true);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `Horizontal overflow at ${width}px, ${id}`);
    }
    console.log(`Responsive categories: ${width}px OK`);
  }
  await page.goto(`${origin}/#menu-salads`);
  assert.equal(await page.locator('[data-category="salads"]').isVisible(), true);
  await page.locator('[data-category="salads"] [data-photo]').first().click();
  assert.equal(await page.locator('#photo').evaluate((node) => node.open), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#photo').evaluate((node) => node.open), false);
  await page.locator('[data-category="salads"] [data-open-contacts]').click();
  assert.equal(await page.locator('#contacts').isVisible(), true);
  await page.keyboard.press('Escape');
  await page.locator('#contacts').waitFor({ state: 'hidden' });
  await page.locator('[data-static-map]').scrollIntoViewIfNeeded();
  await page.locator('[data-static-map]').evaluate((img) => img.decode());
  assert.equal((await context.cookies()).filter((cookie) => cookie.domain.includes('yandex')).length, 0, 'Map image set cross-site cookies');

  await page.locator('[data-cookie-settings]').click();
  await page.locator('[data-cookie="yes"]').click();
  await page.waitForFunction(() => window.__ymCalls?.filter((call) => call[1] === 'init').length === 2);
  assert.equal(requests, 1);
  await page.evaluate(() => {
    const link = document.querySelector('[data-phone-link]');
    link.addEventListener('click', (event) => event.preventDefault(), { once: true });
    link.click();
  });
  const goals = await page.evaluate(() => window.__ymCalls.filter((call) => call[1] === 'reachGoal').map((call) => call[2]));
  assert.deepEqual(goals, ['click_phone', 'make-call']);
  await page.waitForFunction(() => performance.getEntriesByType('resource').some((entry) => entry.name.endsWith('/assets/js/vendor/web-vitals.js')));
  await page.locator('[data-cat="cold"]').click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => window.__ymCalls.some((call) => call[1] === 'params' && call[2].web_vitals?.LCP));
  assert.equal(await page.evaluate(() => window.__ymCalls.some((call) => call[1] === 'params' && call[2].web_vitals?.CLS)), true);
  await page.evaluate(() => { delete document.visibilityState; });

  const second = await context.newPage();
  second.on('pageerror', (error) => errors.push(error.message));
  await second.goto(`${origin}/privacy.html`);
  await second.waitForFunction(() => window.__ymCalls?.filter((call) => call[1] === 'init').length === 2);
  await second.locator('[data-cookie-settings]').click();
  await second.locator('[data-cookie="no"]').click();
  await page.waitForFunction(() => window.__ymCalls?.filter((call) => call[1] === 'destruct').length === 2);
  assert.equal(await second.evaluate(() => window.__ymCalls.filter((call) => call[1] === 'destruct').length), 2);
  const previousCount = requests;
  await second.goto(`${origin}/seo-audit-missing-20261007`);
  assert.equal((await second.locator('h1').innerText()).replace(/\s/g, ' '), 'Страница не найдена');
  assert.equal(requests, previousCount, '404 ignored a saved rejection');
  console.log('Consent, goals, privacy, 404 and cross-tab revocation: OK');

  const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await noJS.newPage();
  await plain.goto(origin);
  assert.equal(await plain.locator('[data-category]:visible').count(), 9);
  assert.equal(await plain.locator('[data-phone-link][href="tel:+79624990044"]').count() > 0, true);
  assert.equal((await plain.locator('[data-address]').first().textContent()).includes('Кирова'), true);
  assert.equal(await plain.locator('a[href="#"]').count(), 0);
  await plain.locator('[data-cat="salads"]').click();
  assert.equal(new URL(plain.url()).hash, '#menu-salads');
  await plain.screenshot({ path: '/tmp/che-no-js.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin);
  await page.locator('[data-category="bread"] img').evaluate((img) => img.decode());
  await page.screenshot({ path: '/tmp/che-mobile.png', animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-category="bread"] img').evaluate((img) => img.decode());
  await page.screenshot({ path: '/tmp/che-desktop.png', animations: 'disabled' });
  assert.deepEqual(errors, [], 'Browser runtime errors');
  console.log('No-JavaScript content, category links, gallery, browser errors: OK');
} finally {
  await browser.close();
}
