import { chromium } from 'playwright-chromium';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function startVite() {
  if (process.env.E2E_PORT) {
    return { server: null, port: Number(process.env.E2E_PORT) };
  }

  const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const server = spawn('npm', ['run', 'dev', '--', '--port=0'], {
    cwd,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  const port = await new Promise((resolve, reject) => {
    server.stdout.setEncoding('utf8');
    server.stdout.on('data', (data) => {
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

  return { server, port };
}

(async () => {
  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    console.warn(`Skipping smoke test: ${err.message}`);
    return;
  }

  const { server, port } = await startVite();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    await page.goto(`http://localhost:${port}/`);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server?.kill('SIGTERM');
  }
})();
