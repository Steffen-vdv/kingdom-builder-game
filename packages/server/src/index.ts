import { fileURLToPath } from 'node:url';

export function startServer(): void {
	console.log('Starting Kingdom Builder server...');
}

const entrypoint = process.argv[1];
const currentModule = fileURLToPath(import.meta.url);

if (entrypoint !== undefined && currentModule === entrypoint) {
	startServer();
}
