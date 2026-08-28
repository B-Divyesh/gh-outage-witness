import { copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const stage = resolve(root, 'dist/package/ci-outage-witness_0.1.0_linux_x86_64');
await rm(resolve(root, 'dist/package'), { recursive: true, force: true });
await mkdir(stage, { recursive: true });

let result = spawnSync('cargo', ['build', '--release', '--locked'], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
await copyFile(resolve(root, 'target/release/gh-ci-outage-witness'), resolve(stage, 'gh-ci-outage-witness'));
await copyFile(resolve(root, 'LICENSE'), resolve(stage, 'LICENSE'));
await copyFile(resolve(root, 'README.md'), resolve(stage, 'README.md'));

result = spawnSync('tar', ['-czf', '../ci-outage-witness_0.1.0_linux_x86_64.tar.gz', '.'], { cwd: stage, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Packed dist/package/ci-outage-witness_0.1.0_linux_x86_64.tar.gz');
