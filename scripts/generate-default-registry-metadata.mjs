import { constants as fsConstants } from 'node:fs';
import { access, writeFile } from 'node:fs/promises';
import { register } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const loaderUrl = new URL(
	'./loaders/extensionless-resolution-loader.mjs',
	import.meta.url,
);
await register(loaderUrl, import.meta.url);

const REQUIRED_DIST_FILES = [
	'../packages/contents/dist/actions.js',
	'../packages/contents/dist/buildings.js',
	'../packages/contents/dist/developments.js',
	'../packages/contents/dist/populations.js',
	'../packages/contents/dist/land.js',
	'../packages/contents/dist/passive.js',
	'../packages/contents/dist/phases.js',
	'../packages/contents/dist/resources.js',
	'../packages/contents/dist/stats.js',
	'../packages/contents/dist/triggers.js',
	'../packages/contents/dist/population.js',
	'../packages/contents/dist/overview.js',
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
		passiveModule,
		phasesModule,
		resourcesModule,
		statsModule,
		triggersModule,
		populationModule,
		overviewModule,
	] = await Promise.all([
		import(new URL('actions.js', baseUrl)),
		import(new URL('buildings.js', baseUrl)),
		import(new URL('developments.js', baseUrl)),
		import(new URL('populations.js', baseUrl)),
		import(new URL('land.js', baseUrl)),
		import(new URL('passive.js', baseUrl)),
		import(new URL('phases.js', baseUrl)),
		import(new URL('resources.js', baseUrl)),
		import(new URL('stats.js', baseUrl)),
		import(new URL('triggers.js', baseUrl)),
		import(new URL('population.js', baseUrl)),
		import(new URL('overview.js', baseUrl)),
	]);
	return {
		createActionRegistry: actionsModule.createActionRegistry,
		createBuildingRegistry: buildingsModule.createBuildingRegistry,
		createDevelopmentRegistry: developmentsModule.createDevelopmentRegistry,
		createPopulationRegistry: populationsModule.createPopulationRegistry,
		LAND_INFO: landModule.LAND_INFO,
		SLOT_INFO: landModule.SLOT_INFO,
		PASSIVE_INFO: passiveModule.PASSIVE_INFO,
		POPULATION_INFO: populationModule.POPULATION_INFO,
		PHASES: phasesModule.PHASES,
		RESOURCES: resourcesModule.RESOURCES,
		STATS: statsModule.STATS,
		TRIGGER_INFO: triggersModule.TRIGGER_INFO,
		OVERVIEW_CONTENT: overviewModule.OVERVIEW_CONTENT,
	};
}

function toDescriptor(definition) {
	const descriptor = {};
	if (definition.icon !== undefined) {
		descriptor.icon = definition.icon;
	}
	const label = definition.label ?? definition.name;
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (definition.description !== undefined) {
		descriptor.description = definition.description;
	}
	return descriptor;
}

function createRegistryDescriptorMap(registry) {
	return Object.fromEntries(
		Object.entries(registry).map(([id, definition]) => [
			id,
			toDescriptor(definition),
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

function createResourceMetadata(resourceDefinitions, content) {
	return Object.fromEntries(
		Object.entries(resourceDefinitions).map(([key, definition]) => {
			const info = content.RESOURCES[key];
			const descriptor = {};
			const icon = definition.icon ?? info?.icon;
			if (icon !== undefined) {
				descriptor.icon = icon;
			}
			const label = definition.label ?? info?.label ?? definition.key ?? key;
			descriptor.label = label;
			const description = definition.description ?? info?.description;
			if (description !== undefined) {
				descriptor.description = description;
			}
			return [key, descriptor];
		}),
	);
}

function createStatMetadata(content) {
	return Object.fromEntries(
		Object.entries(content.STATS).map(([key, info]) => [
			key,
			toDescriptor(info),
		]),
	);
}

function createPhaseMetadata(content) {
	return Object.fromEntries(
		content.PHASES.map((phase) => {
			const steps = (phase.steps ?? []).map((step) => {
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
			const phaseMetadata = { id: phase.id, steps };
			if (phase.label !== undefined) {
				phaseMetadata.label = phase.label;
			}
			if (phase.icon !== undefined) {
				phaseMetadata.icon = phase.icon;
			}
			if (phase.action !== undefined) {
				phaseMetadata.action = phase.action;
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
		land: toDescriptor(content.LAND_INFO),
		slot: toDescriptor(content.SLOT_INFO),
		passive: toDescriptor(content.PASSIVE_INFO),
		population: toDescriptor(content.POPULATION_INFO),
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
		resources: createResourceMetadata(registries.resources, content),
		populations: createRegistryDescriptorMap(registries.populations),
		buildings: createRegistryDescriptorMap(registries.buildings),
		developments: createRegistryDescriptorMap(registries.developments),
		stats: createStatMetadata(content),
		phases: createPhaseMetadata(content),
		triggers: createTriggerMetadata(content),
		assets: createAssetMetadata(content),
		overviewContent: structuredClone(content.OVERVIEW_CONTENT),
	};
}

async function main() {
	await ensureDistArtifacts();
	const content = await loadContentModules();
	const registries = createRegistries(content);
	const metadata = createMetadata(registries, content);
	const snapshot = {
		registries,
		metadata,
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
