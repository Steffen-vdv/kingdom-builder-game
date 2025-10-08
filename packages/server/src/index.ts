import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function startServer(): void {
	console.log('Starting Kingdom Builder server...');
}

const entrypoint = process.argv[1];
const currentModule = fileURLToPath(import.meta.url);

if (entrypoint !== undefined) {
	const normalizedEntrypoint = resolve(entrypoint);
	const normalizedModule = resolve(currentModule);

	if (normalizedEntrypoint === normalizedModule) {
		startServer();
	}
}
