import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function startVite() {
  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const server = spawn('npm', ['run', 'dev', '--', '--port=0'], {
    cwd,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  const port: number = await new Promise((resolve, reject) => {
    server.stdout.setEncoding('utf8');
    server.stdout.on('data', (data: string) => {
      const match = /http:\/\/localhost:(\d+)/.exec(data);
      if (match) {
        resolve(Number(match[1]));
      }
    });
    server.once('error', reject);
    server.once('exit', (code) =>
      reject(new Error(`dev server exited with code ${code}`)),
    );
  });

  return { server, port } as const;
}

test('smoke', async ({ page }) => {
  const { server, port } = await startVite();
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    await page.goto(`http://localhost:${port}/`);
    expect(errors).toEqual([]);
  } finally {
    server.kill('SIGTERM');
  }
});
