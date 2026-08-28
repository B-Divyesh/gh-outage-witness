import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const result = spawnSync('cargo', ['build', '--release', '--locked'], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

const output = resolve(root, 'dist/cli');
await mkdir(output, { recursive: true });
await copyFile(resolve(root, 'target/release/gh-ci-outage-witness'), resolve(output, 'gh-ci-outage-witness'));
