import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

test('home has semantic structure, no console errors, and no serious axe findings', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page).toHaveTitle(/CI Outage Witness/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('img:not([alt])')).toHaveCount(0);
  const findings = await new AxeBuilder({ page }).analyze();
  const serious = findings.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  expect(errors).toEqual([]);
});

test('demo covers empty, loading/result, partial, and reset keyboard paths', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#demo');
  await expect(page.getByText('No specimen selected yet.')).toBeVisible();
  await page.locator('#scenario').selectOption('partial');
  await page.getByRole('button', { name: 'Build example receipt' }).press('Enter');
  await expect(page.getByText('Inconclusive', { exact: true })).toBeVisible();
  await expect(page.getByText(/network error/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset' }).press('Space');
  await expect(page.getByText('No specimen selected yet.')).toBeVisible();
  await expect(page.locator('#scenario')).toBeFocused();
});

test('copy action gives feedback', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/#install');
  const button = page.getByRole('button', { name: 'Copy install command' });
  await button.click();
  await expect(button).toHaveText('Copied');
});

test('mobile layout has no horizontal overflow and retains controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole('link', { name: /Install the extension/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build example receipt' })).toBeVisible();
});

test('dark treatment and reduced motion remain accessible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  const findings = await new AxeBuilder({ page }).analyze();
  const serious = findings.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  await expect(page.locator('.hero-figure')).toHaveCSS('animation-iteration-count', '1');
});

test('cached documentation exposes a clear offline state', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload({ waitUntil: 'networkidle' });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Chromium's DevTools offline emulation does not dispatch the browser's
  // `offline` event, so trigger the same platform event a device emits.
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText(/You’re offline/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('When CI goes silent');
  await context.setOffline(false);
});

for (const path of ['/privacy/', '/terms/']) {
  test(`${path} is a semantic, accessible document`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
    const findings = await new AxeBuilder({ page }).analyze();
    const serious = findings.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical');
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}

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
