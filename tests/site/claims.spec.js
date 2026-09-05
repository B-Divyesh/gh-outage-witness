import { test, expect } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const binary = resolve('dist/cli/gh-outage-witness');

function runCli(args, env = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(binary, args, { env: { ...process.env, ...env } });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolveRun({ code, stdout, stderr }));
  });
}

async function demoBundle() {
  const result = await runCli(['--demo', '--json'], {
    GH_TOKEN: 'must-not-be-read-in-demo',
    GITHUB_TOKEN: 'must-not-be-read-in-demo',
    HTTPS_PROXY: 'http://127.0.0.1:1',
    ALL_PROXY: 'http://127.0.0.1:1',
    NO_PROXY: ''
  });
  expect(result.code, result.stderr).toBe(0);
  const summary = JSON.parse(result.stdout);
  return { result, summary, directory: dirname(summary.bundle) };
}

function zipText(path, entry) {
  return execFileSync('unzip', ['-p', path, entry], { encoding: 'utf8' });
}

test('@claim:cli-demo-bundle @claim:missing-evidence @claim:status-uncertainty builds the bundled incident without setup', async () => {
  const { summary, directory } = await demoBundle();
  try {
    expect(summary.repository).toBe('sample-incidents/payments-api');
    expect(summary.run_id).toBe(44500807);
    expect(summary.classification.label).toBe('probable-platform-degradation');
    expect(summary.classification.confidence).toBe('medium');
    expect(summary.partial).toBe(true);
    const names = execFileSync('unzip', ['-Z1', summary.bundle], { encoding: 'utf8' }).trim().split('\n');
    expect(names).toEqual(expect.arrayContaining([
      'manifest.json', 'summary.md', 'evidence/run.json', 'evidence/jobs.json',
      'evidence/platform-status.json', 'evidence/attempts/attempt-1.json',
      'evidence/attempts/attempt-2.json', 'evidence/attempts/attempt-3.json',
      'runner/runner-journal.log', 'redaction-report.json'
    ]));
    const manifest = JSON.parse(zipText(summary.bundle, 'manifest.json'));
    expect(manifest.sources.logs.state).toBe('unavailable');
    expect(manifest.sources.logs.detail).toContain('HTTP 404');
    expect(manifest.sources['github-status'].observed_at).toBe('2025-07-08T16:32:00Z');
    expect(manifest.sources['github-status'].uncertainty).toContain('not proof');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('@claim:cli-demo-offline @claim:archive-private completes locally and writes an owner-only archive', async () => {
  const { summary, directory } = await demoBundle();
  try {
    expect(summary.bundle).toMatch(/^\/tmp\/ci-outage-witness-demo-/);
    expect((await stat(summary.bundle)).mode & 0o777).toBe(0o600);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('@claim:redaction @claim:token-exclusion removes credentials, ANSI, and the configured sample identifier', async () => {
  const { summary, directory } = await demoBundle();
  try {
    const journal = zipText(summary.bundle, 'runner/runner-journal.log');
    expect(journal).toContain('TOKEN=[REDACTED]');
    expect(journal).toContain('PASSWORD=[REDACTED]');
    expect(journal).not.toContain('demo_token_that_must_not_ship');
    expect(journal).not.toContain('sample multi word password');
    expect(journal).not.toContain('customer_991');
    expect(journal).not.toContain('\u001b');
    const report = JSON.parse(zipText(summary.bundle, 'redaction-report.json'));
    expect(report.total_replacements).toBeGreaterThanOrEqual(3);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('@claim:read-only-requests @claim:runner-opt-in @claim:json-output @claim:output-recovery @claim:strict-partial sends only GET requests and handles output states', async () => {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization });
    response.setHeader('content-type', 'application/json');
    if (request.url === '/status') {
      response.end('{"status":{"indicator":"none"},"components":[{"name":"Actions","status":"operational"}],"incidents":[]}');
    } else if (request.url.includes('/jobs?')) {
      response.end('{"total_count":0,"jobs":[]}');
    } else if (request.url.endsWith('/attempts/1')) {
      response.end('{"id":42,"run_attempt":1}');
    } else {
      response.end('{"id":42,"name":"CI","event":"push","status":"completed","conclusion":"failure","run_attempt":1,"created_at":"2026-09-05T00:00:00Z","html_url":"https://github.com/acme/api/actions/runs/42"}');
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const workspace = await mkdtemp(join(tmpdir(), 'ci-outage-witness-claims-'));
  try {
    const port = server.address().port;
    const output = join(workspace, 'capture.zip');
    const args = [
      'acme/api', '42', '--no-logs', '--json', '--output', output,
      '--api-url', `http://127.0.0.1:${port}`,
      '--status-url', `http://127.0.0.1:${port}/status`
    ];
    const result = await runCli(args, { GH_TOKEN: 'claim-test-token', GITHUB_TOKEN: '' });
    expect(result.code, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ repository: 'acme/api', run_id: 42, partial: false });
    expect(requests).toHaveLength(4);
    expect(requests.every(({ method }) => method === 'GET')).toBe(true);
    expect(requests.filter(({ url }) => url !== '/status').every(({ authorization }) => authorization === 'Bearer claim-test-token')).toBe(true);
    expect(requests.find(({ url }) => url === '/status').authorization).toBeUndefined();
    const names = execFileSync('unzip', ['-Z1', output], { encoding: 'utf8' });
    expect(names).not.toContain('runner/');
    expect(execFileSync('unzip', ['-p', output], { encoding: 'utf8' })).not.toContain('claim-test-token');
    const manifest = JSON.parse(zipText(output, 'manifest.json'));
    expect(manifest.sources['runner-diagnostics'].state).toBe('not-requested');

    const beforeCollision = await readFile(output);
    const collision = await runCli(args, { GH_TOKEN: 'claim-test-token', GITHUB_TOKEN: '' });
    expect(collision.code).toBe(4);
    expect(await readFile(output)).toEqual(beforeCollision);
    const recovered = await runCli([...args, '--force'], { GH_TOKEN: 'claim-test-token', GITHUB_TOKEN: '' });
    expect(recovered.code, recovered.stderr).toBe(0);
    expect((await stat(output)).mode & 0o777).toBe(0o600);

    const partialOutput = join(workspace, 'partial.zip');
    const partial = await runCli([
      'acme/api', '42', '--no-logs', '--json', '--strict',
      '--runner-log', join(workspace, 'missing-runner.log'), '--output', partialOutput,
      '--api-url', `http://127.0.0.1:${port}`,
      '--status-url', `http://127.0.0.1:${port}/status`
    ], { GH_TOKEN: 'claim-test-token', GITHUB_TOKEN: '' });
    expect(partial.code).toBe(5);
    expect(JSON.parse(partial.stdout).partial).toBe(true);
    expect(await stat(partialOutput)).toBeTruthy();
    expect(requests.every(({ method }) => method === 'GET')).toBe(true);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(workspace, { recursive: true, force: true });
  }
});

test('@claim:authentication-inputs uses standard GitHub token sources in order', async () => {
  const authorizations = [];
  const server = createServer((request, response) => {
    if (request.url !== '/status') authorizations.push(request.headers.authorization);
    response.setHeader('content-type', 'application/json');
    if (request.url === '/status') {
      response.end('{"status":{"indicator":"none"},"components":[],"incidents":[]}');
    } else if (request.url.includes('/jobs?')) {
      response.end('{"total_count":0,"jobs":[]}');
    } else if (request.url.endsWith('/attempts/1')) {
      response.end('{"id":42,"run_attempt":1}');
    } else {
      response.end('{"id":42,"name":"CI","event":"push","status":"completed","conclusion":"failure","run_attempt":1,"created_at":"2026-09-05T00:00:00Z","html_url":"https://github.com/acme/api/actions/runs/42"}');
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const workspace = await mkdtemp(join(tmpdir(), 'ci-outage-witness-auth-'));
  try {
    const port = server.address().port;
    const baseArgs = ['acme/api', '42', '--no-logs', '--api-url', `http://127.0.0.1:${port}`, '--status-url', `http://127.0.0.1:${port}/status`];
    const gh = join(workspace, 'gh');
    await writeFile(gh, '#!/bin/sh\nprintf fallback-token\n', { mode: 0o755 });
    const cases = [
      { token: 'primary-token', env: { GH_TOKEN: 'primary-token', GITHUB_TOKEN: 'secondary-token' } },
      { token: 'secondary-token', env: { GH_TOKEN: '', GITHUB_TOKEN: 'secondary-token' } },
      { token: 'fallback-token', env: { GH_TOKEN: '', GITHUB_TOKEN: '', PATH: `${workspace}:${process.env.PATH}` } }
    ];
    for (const [index, item] of cases.entries()) {
      const start = authorizations.length;
      const result = await runCli([...baseArgs, '--output', join(workspace, `auth-${index}.zip`)], item.env);
      expect(result.code, result.stderr).toBe(0);
      expect(authorizations.slice(start)).toEqual([
        `Bearer ${item.token}`, `Bearer ${item.token}`, `Bearer ${item.token}`
      ]);
    }
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(workspace, { recursive: true, force: true });
  }
});

test('@claim:available-logs stores and cleans an available Actions log', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ci-outage-witness-logs-'));
  const sourceDir = join(workspace, 'source');
  await mkdir(sourceDir);
  await writeFile(join(sourceDir, 'job.log'), '\u001b[31mTOKEN=log-secret\u001b[0m\nProcess completed with exit code 1\n');
  const logZip = join(workspace, 'logs.zip');
  execFileSync('zip', ['-q', logZip, 'job.log'], { cwd: sourceDir });
  const archiveBytes = await readFile(logZip);
  const server = createServer((request, response) => {
    if (request.url.endsWith('/logs')) {
      response.setHeader('content-type', 'application/zip');
      response.end(archiveBytes);
    } else {
      response.setHeader('content-type', 'application/json');
      if (request.url === '/status') {
        response.end('{"status":{"indicator":"none"},"components":[{"name":"Actions","status":"operational"}],"incidents":[]}');
      } else if (request.url.includes('/jobs?')) {
        response.end('{"total_count":1,"jobs":[{"id":7,"name":"test","status":"completed","conclusion":"failure"}]}');
      } else if (request.url.endsWith('/attempts/1')) {
        response.end('{"id":42,"run_attempt":1}');
      } else {
        response.end('{"id":42,"name":"CI","event":"push","status":"completed","conclusion":"failure","run_attempt":1,"created_at":"2026-09-05T00:00:00Z","html_url":"https://github.com/acme/api/actions/runs/42"}');
      }
    }
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  try {
    const port = server.address().port;
    const output = join(workspace, 'capture.zip');
    const result = await runCli([
      'acme/api', '42', '--json', '--output', output,
      '--api-url', `http://127.0.0.1:${port}`,
      '--status-url', `http://127.0.0.1:${port}/status`
    ], { GH_TOKEN: 'log-claim-token', GITHUB_TOKEN: '' });
    expect(result.code, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).classification.label).toBe('repository-failure');
    const storedLog = zipText(output, 'logs/job.log');
    expect(storedLog).toContain('Process completed with exit code 1');
    expect(storedLog).toContain('TOKEN=[REDACTED]');
    expect(storedLog).not.toContain('log-secret');
    expect(storedLog).not.toContain('\u001b');
    expect(JSON.parse(zipText(output, 'manifest.json')).sources.logs.state).toBe('collected');
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
    await rm(workspace, { recursive: true, force: true });
  }
});

test('@claim:web-demo-sandbox loads realistic output, keeps sample state separate, and resets', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('real:incident', 'keep-me'));
  await page.goto('/demo/');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByText('Probable platform degradation', { exact: true })).toBeVisible();
  await expect(page.getByText('3 attempts · 18-minute queue wait')).toBeVisible();
  await page.locator('#scenario').selectOption('runner');
  await page.getByRole('button', { name: 'Update sample bundle' }).click();
  await expect(page.getByText('Runner failure', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('demo:ci-outage-witness:scenario'))).toBe('runner');
  expect(await page.evaluate(() => localStorage.getItem('real:incident'))).toBe('keep-me');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Probable platform degradation', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('demo:ci-outage-witness:scenario'))).toBe('platform');
  expect(await page.evaluate(() => localStorage.getItem('real:incident'))).toBe('keep-me');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator('[data-demo-banner]')).toBeInViewport();
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/#install$/);
  expect(await page.evaluate(() => localStorage.getItem('demo:ci-outage-witness:scenario'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('real:incident'))).toBe('keep-me');
});

test('@claim:site-privacy makes only same-origin requests and sets no cookies', async ({ page, context }) => {
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo/', { waitUntil: 'networkidle' });
  await page.locator('#scenario').selectOption('code');
  await page.getByRole('button', { name: 'Update sample bundle' }).click();
  await expect(page.getByText('Repository failure', { exact: true })).toBeVisible();
  const origin = new URL(page.url()).origin;
  expect(requests.every((url) => new URL(url).origin === origin)).toBe(true);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['demo:ci-outage-witness:scenario']);
  expect(await page.evaluate(() => Object.keys(sessionStorage))).toEqual([]);
});

test('@claim:offline-site reloads the demo after the first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/demo/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'networkidle' });
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByText('Probable platform degradation', { exact: true })).toBeVisible();
    await expect(page.getByText(/You are offline/)).toBeVisible();
  } finally {
    await context.close();
  }
});

test('@claim:mit-license ships the complete MIT license', async ({ page }) => {
  const license = await readFile(resolve('LICENSE'), 'utf8');
  expect(license).toContain('Permission is hereby granted, free of charge');
  expect(license).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  await page.goto('/');
  await expect(page.getByText('Free under the MIT License')).toBeVisible();
});

test('@claim:terminal-recording matches the CLI demo result', async ({ page }) => {
  const { result, summary, directory } = await demoBundle();
  try {
    await page.goto('/');
    const recording = page.locator('[data-terminal-recording]');
    await expect(recording).toContainText('gh outage-witness --demo');
    await expect(recording).toContainText(summary.classification.label);
    expect(result.stdout).toContain('sample-incident.zip');
    await expect(recording).toContainText('sample-incident.zip');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('@claim:packaged-cli runs from an empty consumer directory', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ci-outage-witness-consumer-'));
  try {
    const installed = join(workspace, 'gh-outage-witness');
    await writeFile(installed, await readFile(binary), { mode: 0o755 });
    const result = await new Promise((resolveRun) => {
      const child = spawn(installed, ['--demo', '--json'], { cwd: workspace });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk) => { stdout += chunk; });
      child.stderr.on('data', (chunk) => { stderr += chunk; });
      child.on('close', (code) => resolveRun({ code, stdout, stderr }));
    });
    expect(result.code, result.stderr).toBe(0);
    const summary = JSON.parse(result.stdout);
    expect(summary.classification.label).toBe('probable-platform-degradation');
    expect(await stat(summary.bundle)).toBeTruthy();
    await rm(dirname(summary.bundle), { recursive: true, force: true });
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
});
