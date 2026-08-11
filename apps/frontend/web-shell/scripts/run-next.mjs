import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

if (existsSync('.env.local')) {
  loadEnvFile('.env.local');
}

const nextBin = 'node_modules/next/dist/bin/next';
const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
