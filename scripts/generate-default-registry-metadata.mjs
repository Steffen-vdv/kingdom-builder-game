import { constants as fsConstants } from 'node:fs';
import { access, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Regenerates the default registry metadata snapshot consumed by the web
 * client. The script requires the built dist artifacts from
 * `@kingdom-builder/contents`, including the overview exports, so run
 * `npm run build --workspace @kingdom-builder/contents` beforehand.
 */
const REQUIRED_DIST_FILES = [
	'../packages/contents/dist/actions.js',
	'../packages/contents/dist/buildings.js',
	'../packages/contents/dist/developments.js',
	'../packages/contents/dist/populations.js',
	'../packages/contents/dist/land.js',
	'../packages/contents/dist/overview.js',
	'../packages/contents/dist/passive.js',
	'../packages/contents/dist/phases.js',
	'../packages/contents/dist/resources.js',
	'../packages/contents/dist/stats.js',
	'../packages/contents/dist/triggers.js',
];

async function ensureDistArtifacts() {
	const baseDir = dirname(fileURLToPath(import.meta.url));
	await Promise.all(
		REQUIRED_DIST_FILES.map(async (relativePath) => {
			const absolutePath = resolve(baseDir, relativePath);
			try {
				await access(absolutePath, fsConstants.F_OK | fsConstants.R_OK);
			} catch (error) {
				throw new Error(
					`Missing required dist artifact: ${relativePath}. ` +
						"Run 'npm run build --workspace @kingdom-builder/contents' before regenerating.",
				);
			}
		}),
	);
}

async function loadContentModules() {
	const baseUrl = new URL('../packages/contents/dist/', import.meta.url);
	const [
		actionsModule,
		buildingsModule,
		developmentsModule,
		populationsModule,
		landModule,
		overviewModule,
		passiveModule,
		phasesModule,
		resourcesModule,
		statsModule,
		triggersModule,
	] = await Promise.all([
		import(new URL('actions.js', baseUrl)),
		import(new URL('buildings.js', baseUrl)),
		import(new URL('developments.js', baseUrl)),
		import(new URL('populations.js', baseUrl)),
		import(new URL('land.js', baseUrl)),
		import(new URL('overview.js', baseUrl)),
		import(new URL('passive.js', baseUrl)),
		import(new URL('phases.js', baseUrl)),
		import(new URL('resources.js', baseUrl)),
		import(new URL('stats.js', baseUrl)),
		import(new URL('triggers.js', baseUrl)),
	]);
	return {
		createActionRegistry: actionsModule.createActionRegistry,
		createBuildingRegistry: buildingsModule.createBuildingRegistry,
		createDevelopmentRegistry: developmentsModule.createDevelopmentRegistry,
		createPopulationRegistry: populationsModule.createPopulationRegistry,
		LAND_INFO: landModule.LAND_INFO,
		SLOT_INFO: landModule.SLOT_INFO,
		OVERVIEW_CONTENT: overviewModule.OVERVIEW_CONTENT,
		PASSIVE_INFO: passiveModule.PASSIVE_INFO,
		PHASES: phasesModule.PHASES,
		RESOURCES: resourcesModule.RESOURCES,
		STATS: statsModule.STATS,
		TRIGGER_INFO: triggersModule.TRIGGER_INFO,
	};
}

function createDescriptor(label, icon, description) {
	const descriptor = {};
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (description !== undefined) {
		descriptor.description = description;
	}
	return descriptor;
}

function createRegistryDescriptorMap(registry) {
	return Object.fromEntries(
		Object.entries(registry).map(([id, definition]) => [
			id,
			createDescriptor(
				definition.name,
				definition.icon,
				definition.description,
			),
		]),
	);
}

function createResourceDefinitions(content) {
	return Object.fromEntries(
		Object.entries(content.RESOURCES).map(([key, info]) => {
			const entry = { key };
			if (info.icon !== undefined) {
				entry.icon = info.icon;
			}
			if (info.label !== undefined) {
				entry.label = info.label;
			}
			if (info.description !== undefined) {
				entry.description = info.description;
			}
			if (info.tags && info.tags.length > 0) {
				entry.tags = [...info.tags];
			}
			return [key, entry];
		}),
	);
}

function createResourceMetadata(content) {
	return Object.fromEntries(
		Object.entries(content.RESOURCES).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);
}

function createStatMetadata(content) {
	return Object.fromEntries(
		Object.entries(content.STATS).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);
}

function createPhaseMetadata(content) {
	return Object.fromEntries(
		content.PHASES.map((phase) => {
			const steps = phase.steps?.map((step) => {
				const baseStep = { id: step.id };
				if (step.title !== undefined) {
					baseStep.label = step.title;
				}
				if (step.icon !== undefined) {
					baseStep.icon = step.icon;
				}
				if (step.triggers && step.triggers.length > 0) {
					baseStep.triggers = [...step.triggers];
				}
				return baseStep;
			});
			const phaseMetadata = { id: phase.id };
			if (phase.label !== undefined) {
				phaseMetadata.label = phase.label;
			}
			if (phase.icon !== undefined) {
				phaseMetadata.icon = phase.icon;
			}
			if (phase.action !== undefined) {
				phaseMetadata.action = phase.action;
			}
			if (steps && steps.length > 0) {
				phaseMetadata.steps = steps;
			}
			return [phase.id, phaseMetadata];
		}),
	);
}

function createTriggerMetadata(content) {
	return Object.fromEntries(
		Object.entries(content.TRIGGER_INFO).map(([key, info]) => [
			key,
			{
				label: info.past,
				icon: info.icon,
				future: info.future,
				past: info.past,
			},
		]),
	);
}

function createAssetMetadata(content) {
	return {
		land: createDescriptor(content.LAND_INFO.label, content.LAND_INFO.icon),
		slot: createDescriptor(content.SLOT_INFO.label, content.SLOT_INFO.icon),
		passive: createDescriptor(
			content.PASSIVE_INFO.label,
			content.PASSIVE_INFO.icon,
		),
	};
}

function serializeRegistry(registry) {
	return Object.fromEntries(
		registry
			.entries()
			.map(([id, definition]) => [id, structuredClone(definition)]),
	);
}

function createRegistries(content) {
	return {
		actions: serializeRegistry(content.createActionRegistry()),
		buildings: serializeRegistry(content.createBuildingRegistry()),
		developments: serializeRegistry(content.createDevelopmentRegistry()),
		populations: serializeRegistry(content.createPopulationRegistry()),
		resources: createResourceDefinitions(content),
	};
}

function createMetadata(registries, content) {
	return {
		passiveEvaluationModifiers: {},
		resources: createResourceMetadata(content),
		populations: createRegistryDescriptorMap(registries.populations),
		buildings: createRegistryDescriptorMap(registries.buildings),
		developments: createRegistryDescriptorMap(registries.developments),
		stats: createStatMetadata(content),
		phases: createPhaseMetadata(content),
		triggers: createTriggerMetadata(content),
		assets: createAssetMetadata(content),
	};
}

async function main() {
	await ensureDistArtifacts();
	const content = await loadContentModules();
	const registries = createRegistries(content);
	const metadata = createMetadata(registries, content);
	// Preserve plain data structures so `defaultRegistryMetadata.ts` can
	// continue deep-freezing the fallback snapshot safely.
	const snapshot = {
		registries,
		metadata,
		overviewContent: structuredClone(content.OVERVIEW_CONTENT),
	};
	const target = resolve(
		dirname(fileURLToPath(import.meta.url)),
		'../packages/web/src/contexts/defaultRegistryMetadata.json',
	);
	await writeFile(target, `${JSON.stringify(snapshot, null, '\t')}\n`);
	console.log(`✓ Generated metadata snapshot: ${target}`);
}

try {
	await main();
} catch (error) {
	console.error('Failed to generate metadata snapshot:', error);
	process.exit(1);
}
