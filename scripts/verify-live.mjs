import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from '@playwright/test';

const baseURL = new URL(process.argv[2] ?? 'https://ci-outage-witness.sociobot.in/');
const browser = await chromium.launch();
const report = { url: baseURL.href };

const seriousViolations = async (page) => {
  const analysis = await new AxeBuilder({ page }).analyze();
  return analysis.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
};

const assertTouchTargets = async (page) => {
  const undersized = await page.locator('a, button, select').evaluateAll((elements) => elements.flatMap((element) => {
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height || getComputedStyle(element).visibility === 'hidden') return [];
    return box.width < 44 || box.height < 44
      ? [{ text: (element.textContent ?? element.getAttribute('aria-label') ?? '').trim(), width: box.width, height: box.height }]
      : [];
  }));
  assert.deepEqual(undersized, []);
};

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  const errors = [];
  const runtimeRequests = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => runtimeRequests.push({ url: request.url(), method: request.method() }));
  const response = await page.goto(baseURL.href, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200);
  assert.equal(await page.title(), 'CI Outage Witness — capture Actions incident evidence');
  assert.equal(await page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('img:not([alt])').count(), 0);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://ci-outage-witness.sociobot.in/');
  assert.equal(await page.locator('meta[property="og:image"]').count(), 1);
  assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
  assert.equal(await page.locator('link[rel="apple-touch-icon"]').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1), true);
  assert.deepEqual(await seriousViolations(page), []);
  await assertTouchTargets(page);

  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.skip-link').evaluate((element) => element === document.activeElement), true);
  assert.equal(await page.locator('.skip-link').evaluate((element) => getComputedStyle(element).outlineWidth), '3px');
  await page.getByRole('link', { name: /Try it with sample data/ }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/demo\/?$/);
  await page.getByText('Demo — sample data, nothing is saved').waitFor();
  await page.locator('#scenario').selectOption('runner');
  await page.getByRole('button', { name: 'Update sample bundle' }).focus();
  await page.keyboard.press('Enter');
  await page.getByText('Runner failure', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reset demo' }).focus();
  await page.keyboard.press('Space');
  await page.getByText('Probable platform degradation', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.equal(runtimeRequests.every(({ url, method }) => new URL(url).origin === baseURL.origin && ['GET', 'HEAD'].includes(method)), true);
  report.desktop = { axeSerious: 0, consoleErrors: 0, touchTargets: '>=44px', runtimeRequests: runtimeRequests.length };
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark', reducedMotion: 'reduce' });
  const mobilePage = await mobile.newPage();
  const mobileErrors = [];
  mobilePage.on('pageerror', (error) => mobileErrors.push(String(error)));
  mobilePage.on('console', (message) => { if (message.type() === 'error') mobileErrors.push(message.text()); });
  await mobilePage.goto(baseURL.href, { waitUntil: 'networkidle' });
  assert.equal(await mobilePage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth <= 1), true);
  assert.deepEqual(await seriousViolations(mobilePage), []);
  await assertTouchTargets(mobilePage);
  const sampleAction = await mobilePage.getByRole('link', { name: /Try it with sample data/ }).boundingBox();
  assert.ok(sampleAction.y + sampleAction.height <= 844);
  for (const command of await mobilePage.locator('.command-block > code').all()) {
    await command.focus();
    assert.equal(await command.evaluate((element) => element === document.activeElement), true);
  }
  const reducedDuration = await mobilePage.locator('.hero-figure').evaluate((element) => getComputedStyle(element).animationDuration);
  const reducedDurationMs = reducedDuration.endsWith('ms') ? Number.parseFloat(reducedDuration) : Number.parseFloat(reducedDuration) * 1000;
  assert.ok(reducedDurationMs <= 0.01, `reduced-motion duration was ${reducedDuration}`);
  for (const path of ['/demo/', '/privacy/', '/terms/']) {
    const documentResponse = await mobilePage.goto(new URL(path, baseURL).href, { waitUntil: 'networkidle' });
    assert.equal(documentResponse.status(), 200);
    assert.equal(await mobilePage.locator('h1').count(), 1);
    assert.equal(await mobilePage.locator('main').count(), 1);
    assert.deepEqual(await seriousViolations(mobilePage), []);
    await assertTouchTargets(mobilePage);
  }
  assert.deepEqual(mobileErrors, []);
  const missingResponse = await mobilePage.goto(new URL('/missing-verification-route', baseURL).href);
  assert.equal(missingResponse.status(), 404);
  assert.equal(await mobilePage.locator('h1').textContent(), 'Page not found');
  report.mobile = { viewport: '390x844', axeSerious: 0, consoleErrors: 0, touchTargets: '>=44px', commandScrollersFocusable: 2 };
  await mobile.close();

  const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const offlinePage = await offline.newPage();
  await offlinePage.goto(new URL('/demo/', baseURL).href, { waitUntil: 'networkidle' });
  await offlinePage.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await offlinePage.reload({ waitUntil: 'networkidle' });
  const cacheState = await offlinePage.evaluate(async () => ({
    keys: await caches.keys(),
    urls: (await (await caches.open('ci-outage-witness-v4')).keys()).map(({ url }) => url)
  }));
  assert.ok(cacheState.keys.includes('ci-outage-witness-v4'));
  assert.ok(cacheState.urls.some((url) => new URL(url).pathname === '/demo/'));
  await offline.setOffline(true);
  await offlinePage.reload({ waitUntil: 'domcontentloaded' });
  await offlinePage.evaluate(() => window.dispatchEvent(new Event('offline')));
  await offlinePage.getByText(/You are offline/).waitFor();
  assert.match(await offlinePage.locator('h1').textContent(), /Inspect a sample CI incident/);
  await offlinePage.getByText('Probable platform degradation', { exact: true }).waitFor();
  report.offline = { cache: 'ci-outage-witness-v4', reload: 'pass', update: 'pass' };
  await offline.close();

  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
