import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRuntimeConfigFallback } from './runtimeConfigFallback';

const filePath = resolve('packages/web/src/startup/runtimeConfigFallback.json');
const fallbackConfig = buildRuntimeConfigFallback();
writeFileSync(filePath, `${JSON.stringify(fallbackConfig, null, 2)}\n`);
