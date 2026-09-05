import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const archive = resolve(root, 'dist/package/ci-outage-witness_0.1.2_linux_x86_64.tar.gz');
const consumer = await mkdtemp(join(tmpdir(), 'ci-outage-witness-consumer-'));
const requests = [];
const server = createServer((request, response) => {
  requests.push({ method: request.method, url: request.url, headers: request.headers });
  response.setHeader('content-type', 'application/json');
  if (request.url === '/status') {
    response.end('{"status":{"indicator":"none"},"components":[{"name":"Actions","status":"operational"}],"incidents":[]}');
  } else if (request.url.includes('/jobs?')) {
    response.end('{"total_count":0,"jobs":[]}');
  } else if (request.url.endsWith('/attempts/1')) {
    response.end('{"id":42,"run_attempt":1}');
  } else {
    response.end('{"id":42,"name":"CI","event":"push","status":"completed","conclusion":"failure","run_attempt":1,"created_at":"2026-08-28T00:00:00Z","html_url":"https://github.com/acme/api/actions/runs/42"}');
  }
});

try {
  execFileSync('tar', ['-xzf', archive, '-C', consumer]);
  const binary = join(consumer, 'gh-outage-witness');
  await chmod(binary, 0o755);
  assert.ok((await stat(join(consumer, 'examples/demo/run.json'))).size > 0);
  assert.match(execFileSync(binary, ['--version'], { encoding: 'utf8' }), /0\.1\.2/);
  assert.match(execFileSync(binary, ['--help'], { encoding: 'utf8' }), /EXIT CODES/);
  const demo = JSON.parse(execFileSync(binary, ['--demo', '--json'], {
    encoding: 'utf8',
    cwd: consumer,
    env: { ...process.env, GH_TOKEN: 'unused-demo-token', HTTPS_PROXY: 'http://127.0.0.1:1' }
  }));
  assert.equal(demo.classification.label, 'probable-platform-degradation');
  assert.equal((await stat(demo.bundle)).mode & 0o777, 0o600);
  assert.match(execFileSync('unzip', ['-Z1', demo.bundle], { encoding: 'utf8' }), /runner\/runner-journal\.log/);
  await rm(dirname(demo.bundle), { recursive: true, force: true });

  const runner = join(consumer, 'runner.log');
  await writeFile(runner, 'PASSWORD="correct horse battery staple"\nTOKEN=singleword\nAUTHORIZATION: Bearer bearer-token-value\n');
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const { port } = server.address();
  const output = join(consumer, 'incident.zip');
  const child = spawn(binary, [
    'acme/api', '42', '--no-logs', '--json', '--runner-log', runner,
    '--output', output, '--api-url', `http://127.0.0.1:${port}`,
    '--status-url', `http://127.0.0.1:${port}/status`
  ], { env: { ...process.env, GH_TOKEN: 'consumer-test-token', GITHUB_TOKEN: '' } });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const exitCode = await new Promise((resolveExit) => child.on('close', resolveExit));
  assert.equal(exitCode, 0, stderr);
  assert.equal(JSON.parse(stdout).partial, false);

  const mode = (await stat(output)).mode & 0o777;
  assert.equal(mode, 0o600, `outer bundle mode was ${mode.toString(8)}`);
  const runnerEvidence = execFileSync('unzip', ['-p', output, 'runner/runner.log'], { encoding: 'utf8' });
  assert.equal(runnerEvidence, 'PASSWORD=[REDACTED]\nTOKEN=[REDACTED]\nAUTHORIZATION: Bearer [REDACTED]\n');

  assert.equal(requests.length, 4);
  assert.ok(requests.every(({ method, headers }) => method === 'GET' && headers['user-agent'] === 'ci-outage-witness/0.1.2'));
  assert.ok(requests.filter(({ url }) => url !== '/status').every(({ headers }) => headers.authorization === 'Bearer consumer-test-token'));
  assert.equal(requests.find(({ url }) => url === '/status').headers.authorization, undefined);
  console.log(`Packaged consumer capture passed: ${output} (mode ${mode.toString(8)}, ${requests.length} read-only requests)`);
} finally {
  await new Promise((resolveClose) => server.close(resolveClose));
  await rm(consumer, { recursive: true, force: true });
}
