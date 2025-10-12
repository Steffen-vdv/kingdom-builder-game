#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'..',
);

function run(command) {
	execSync(command, { cwd: repoRoot, stdio: 'inherit' });
}

function patchSpecifiers(rootDir) {
	if (!fs.existsSync(rootDir)) {
		return;
	}
	const stack = [rootDir];
	while (stack.length > 0) {
		const current = stack.pop();
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const resolved = path.join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(resolved);
				continue;
			}
			if (!entry.isFile() || !entry.name.endsWith('.js')) {
				continue;
			}
			const content = fs.readFileSync(resolved, 'utf8');
			const updated = content.replace(
				/from\s+['"](\.\/?[^'"\n]+)['"]/g,
				(match, specifier) => {
					if (!specifier.startsWith('.')) {
						return match;
					}
					const withoutExt = specifier.endsWith('.js')
						? specifier.slice(0, -3)
						: specifier;
					const resolvedBase = path.resolve(path.dirname(resolved), withoutExt);
					const candidates = [
						{
							spec: `${withoutExt}.js`,
							path: `${resolvedBase}.js`,
						},
						{
							spec: `${withoutExt}/index.js`,
							path: path.join(resolvedBase, 'index.js'),
						},
					];
					for (const candidate of candidates) {
						if (fs.existsSync(candidate.path)) {
							return `from '${candidate.spec}'`;
						}
					}
					return match;
				},
			);
			if (updated !== content) {
				fs.writeFileSync(resolved, updated);
			}
		}
	}
}

async function main() {
	run('npm run build --workspace @kingdom-builder/protocol');
	run('npm run build --workspace @kingdom-builder/contents');

	patchSpecifiers(path.join(repoRoot, 'packages/protocol/dist'));
	patchSpecifiers(path.join(repoRoot, 'packages/contents/dist'));

	const contentsModule = await import(
		pathToFileURL(path.join(repoRoot, 'packages/contents/dist/index.js')).href
	);

	const developmentRegistry = contentsModule.createDevelopmentRegistry();
	const developmentIds = [];
	for (const [identifier, definition] of developmentRegistry.entries()) {
		if (definition?.system) {
			continue;
		}
		developmentIds.push(identifier);
	}
	developmentIds.sort((left, right) => {
		const leftOrder =
			typeof developmentRegistry.get(left)?.order === 'number'
				? developmentRegistry.get(left)?.order
				: Number.MAX_SAFE_INTEGER;
		const rightOrder =
			typeof developmentRegistry.get(right)?.order === 'number'
				? developmentRegistry.get(right)?.order
				: Number.MAX_SAFE_INTEGER;
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return left.localeCompare(right);
	});

	const resources = Object.fromEntries(
		Object.entries(contentsModule.RESOURCES).map(([key, definition]) => {
			const entry = { key };
			if (definition.icon !== undefined) {
				entry.icon = definition.icon;
			}
			if (definition.label !== undefined) {
				entry.label = definition.label;
			}
			if (definition.description !== undefined) {
				entry.description = definition.description;
			}
			if (definition.tags && definition.tags.length > 0) {
				entry.tags = [...definition.tags];
			}
			return [key, entry];
		}),
	);

	const snapshot = {
		phases: contentsModule.PHASES,
		start: contentsModule.GAME_START,
		rules: contentsModule.RULES,
		resources,
		primaryIconId: contentsModule.PRIMARY_ICON_ID ?? null,
		developerPreset: {
			resourceTargets: [
				{ key: contentsModule.Resource.gold, target: 100 },
				{ key: contentsModule.Resource.happiness, target: 10 },
			],
			populationPlan: [
				{ role: contentsModule.PopulationRole.Council, count: 2 },
				{ role: contentsModule.PopulationRole.Legion, count: 1 },
				{ role: contentsModule.PopulationRole.Fortifier, count: 1 },
			],
			landCount: 5,
			developments: developmentIds,
			buildings: [contentsModule.BuildingId.Mill],
		},
	};

	const targetPath = path.join(
		repoRoot,
		'packages/web/src/startup/legacyContentFallback.json',
	);
	fs.writeFileSync(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`);
	console.log(
		`Updated fallback config → ${path.relative(repoRoot, targetPath)}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
