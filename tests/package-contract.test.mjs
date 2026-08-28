import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const extension = 'B-Divyesh/gh-outage-witness';
const repositoryName = extension.split('/')[1];
const commandName = repositoryName.slice(3);

test('documented GitHub CLI extension names agree with the compiled binary', async () => {
  assert.match(repositoryName, /^gh-[a-z0-9-]+$/, 'GitHub CLI repositories must start with gh-');

  const metadata = JSON.parse(execFileSync('cargo', ['metadata', '--no-deps', '--format-version', '1'], { encoding: 'utf8' }));
  const binaryTargets = metadata.packages[0].targets.filter(({ kind }) => kind.includes('bin')).map(({ name }) => name);
  assert.deepEqual(binaryTargets, [repositoryName]);

  const [readme, home, buildScript, packScript] = await Promise.all([
    readFile('README.md', 'utf8'),
    readFile('site/index.html', 'utf8'),
    readFile('scripts/build-cli.mjs', 'utf8'),
    readFile('scripts/pack-cli.mjs', 'utf8')
  ]);
  for (const document of [readme, home]) {
    assert.match(document, new RegExp(`gh extension install ${extension}`));
    assert.match(document, new RegExp(`gh ${commandName}(?: | --help)`));
  }
  assert.match(buildScript, new RegExp(`target/release/${repositoryName}`));
  assert.match(packScript, new RegExp(`${repositoryName}_linux-amd64`));
});
