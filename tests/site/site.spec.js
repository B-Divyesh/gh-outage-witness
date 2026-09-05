import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const seriousViolations = async (page) => {
  const findings = await new AxeBuilder({ page }).analyze();
  return findings.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
};

test('home states the job, audience, and sample action with complete metadata', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page).toHaveTitle('CI Outage Witness — capture Actions incident evidence');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Capture evidence for one failed Actions run');
  await expect(page.getByText(/For maintainers investigating/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Try it with sample data/ })).toBeVisible();
  await expect(page.locator('img:not([alt])')).toHaveCount(0);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://ci-outage-witness.sociobot.in/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /ci-outage-witness-social\.jpg$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('sizes', '180x180');
  expect(await seriousViolations(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('demo starts populated and supports keyboard update and reset', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/demo/');
  await expect(page).toHaveTitle('Demo — CI Outage Witness');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Probable platform degradation', { exact: true })).toBeVisible();
  await page.locator('#scenario').selectOption('partial');
  await page.getByRole('button', { name: 'Update sample bundle' }).press('Enter');
  await expect(page.getByText('Inconclusive', { exact: true })).toBeVisible();
  await expect(page.getByText(/network error/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).press('Space');
  await expect(page.getByText('Probable platform degradation', { exact: true })).toBeVisible();
  await expect(page.locator('#scenario')).toBeFocused();
});

test('compatibility demo query enters the labelled sandbox', async ({ page }) => {
  await page.goto('/?demo=1');
  await expect(page).toHaveURL(/\/demo\/$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Probable platform degradation', { exact: true })).toBeVisible();
});

test('copy action gives feedback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#install');
  const button = page.getByRole('button', { name: 'Copy install command' });
  await button.click();
  await expect(button).toHaveText('Copied');
});

test('phone layout keeps the first action visible and every control accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const sampleAction = page.getByRole('link', { name: /Try it with sample data/ });
  await expect(sampleAction).toBeVisible();
  const firstAction = await sampleAction.boundingBox();
  expect(firstAction.y + firstAction.height).toBeLessThanOrEqual(844);
  expect(await seriousViolations(page)).toEqual([]);
  for (const command of await page.locator('.command-block > code').all()) {
    await command.focus();
    await expect(command).toBeFocused();
  }
  const undersized = await page.locator('a, button, select').evaluateAll((elements) => elements.flatMap((element) => {
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height || getComputedStyle(element).visibility === 'hidden') return [];
    return box.width < 44 || box.height < 44 ? [{ text: element.textContent.trim(), width: box.width, height: box.height }] : [];
  }));
  expect(undersized).toEqual([]);
});

test('keyboard order starts with the skip link and focus remains visible', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await expect(page.locator('.skip-link')).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('dark treatment and reduced motion remain accessible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/demo/');
  expect(await seriousViolations(page)).toEqual([]);
  await expect(page.locator('.loading-shard')).toHaveCount(0);
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
});

test('cached documentation exposes a clear offline state', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'networkidle' });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByText(/You are offline/)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Capture evidence');
  } finally {
    await context.close();
  }
});

for (const path of ['/privacy/', '/terms/']) {
  test(`${path} is a complete, accessible document`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Demo' })).toBeVisible();
    await expect(page.getByRole('contentinfo')).toContainText('Built by Param Factory');
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test('designed 404 has metadata and clear recovery actions', async ({ page }) => {
  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — CI Outage Witness');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await expect(page.getByRole('link', { name: 'Return home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the sample' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

test('production assets stay within the static performance budgets', async () => {
  const assets = resolve('dist/site/assets');
  const files = await readdir(assets);
  const total = async (suffixes) => {
    let bytes = 0;
    for (const file of files.filter((name) => suffixes.some((suffix) => name.endsWith(suffix)))) {
      bytes += (await stat(resolve(assets, file))).size;
    }
    return bytes;
  };
  expect(await total(['.js'])).toBeLessThanOrEqual(200 * 1024);
  expect(await total(['.css'])).toBeLessThanOrEqual(50 * 1024);
  expect(await total(['.woff2'])).toBeLessThanOrEqual(120 * 1024);
  expect((await stat(resolve('dist/site/ceramic-witness.webp'))).size).toBeLessThanOrEqual(300 * 1024);
});
