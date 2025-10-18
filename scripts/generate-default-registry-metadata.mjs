import { writeFile } from 'node:fs/promises';
import {
	buildDefaultRegistrySnapshot,
	getDefaultRegistrySnapshotPath,
} from './build-default-registry-snapshot.mjs';

// Regenerate with `npm run generate:snapshots` whenever content registries
// change.
async function main() {
	const snapshot = await buildDefaultRegistrySnapshot();
	const target = getDefaultRegistrySnapshotPath();
	await writeFile(target, `${JSON.stringify(snapshot, null, '	')}\n`);
	console.log(`✓ Generated metadata snapshot: ${target}`);
}

try {
	await main();
} catch (error) {
	console.error('Failed to generate metadata snapshot:', error);
	process.exit(1);
}
