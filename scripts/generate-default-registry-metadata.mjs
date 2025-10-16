import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Regenerate with `npx tsx scripts/generate-default-registry-metadata.mjs`
// after rebuilding @kingdom-builder/contents to stay aligned with the server
/**
 * Load content modules from the contents package and expose their registry creators and metadata.
 *
 * @returns {Object} An object containing factory functions and content metadata:
 * - createActionRegistry: function that creates the action registry.
 * - createBuildingRegistry: function that creates the building registry.
 * - createDevelopmentRegistry: function that creates the development registry.
 * - createPopulationRegistry: function that creates the population registry.
 * - POPULATION_INFO: population-related constants and descriptors.
 * - LAND_INFO: land-related constants and descriptors.
 * - SLOT_INFO: slot-related constants and descriptors.
 * - PASSIVE_INFO: passive-related constants and descriptors.
 * - PHASES: phase definitions.
 * - RESOURCES: resource definitions.
 * - STATS: stat definitions.
 * - TRIGGER_INFO: trigger definitions and labels.
 * - OVERVIEW_CONTENT: snapshot of overview content.
 */

async function loadContentModules() {
	const baseUrl = new URL('../packages/contents/src/', import.meta.url);
	const [
		actionsModule,
		buildingsModule,
		developmentsModule,
		populationsModule,
		populationModule,
		landModule,
		passiveModule,
		phasesModule,
		resourcesModule,
		statsModule,
		triggersModule,
		overviewModule,
	] = await Promise.all([
		import(new URL('actions.ts', baseUrl)),
		import(new URL('buildings.ts', baseUrl)),
		import(new URL('developments.ts', baseUrl)),
		import(new URL('populations.ts', baseUrl)),
		import(new URL('population.ts', baseUrl)),
		import(new URL('land.ts', baseUrl)),
		import(new URL('passive.ts', baseUrl)),
		import(new URL('phases.ts', baseUrl)),
		import(new URL('resources.ts', baseUrl)),
		import(new URL('stats.ts', baseUrl)),
		import(new URL('triggers.ts', baseUrl)),
		import(new URL('overview.ts', baseUrl)),
	]);
	return {
		createActionRegistry: actionsModule.createActionRegistry,
		createBuildingRegistry: buildingsModule.createBuildingRegistry,
		createDevelopmentRegistry: developmentsModule.createDevelopmentRegistry,
		createPopulationRegistry: populationsModule.createPopulationRegistry,
		POPULATION_INFO: populationModule.POPULATION_INFO,
		LAND_INFO: landModule.LAND_INFO,
		SLOT_INFO: landModule.SLOT_INFO,
		PASSIVE_INFO: passiveModule.PASSIVE_INFO,
		PHASES: phasesModule.PHASES,
		RESOURCES: resourcesModule.RESOURCES,
		STATS: statsModule.STATS,
		TRIGGER_INFO: triggersModule.TRIGGER_INFO,
		OVERVIEW_CONTENT: overviewModule.OVERVIEW_CONTENT,
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

/**
 * Create a metadata map for triggers from content.TRIGGER_INFO.
 *
 * @param {object} content - Module exports containing a TRIGGER_INFO object.
 * @returns {Object<string, {label: string, icon?: string, future?: string, past: string}>} A mapping of trigger keys to metadata objects where `label` and `past` are set to the trigger's past text, and `icon` and `future` are included when present.
 */
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

/**
 * Locate the phase with id 'upkeep' in a list of phases.
 * @param {Array<Object>} phases - Array of phase objects to search; each phase is expected to have an `id` property.
 * @returns {Object|undefined} The phase object with id 'upkeep', or `undefined` if none is found.
 */
function findUpkeepPhase(phases) {
	return phases.find((phase) => phase.id === 'upkeep');
}

/**
 * Build a canonical set of asset descriptors (population, land, slot, passive, upkeep) from content metadata.
 *
 * @param {object} content - Content exports that provide asset and phase metadata.
 * @param {object} content.POPULATION_INFO - Population metadata with `label`, `icon`, and optional `description`.
 * @param {object} content.LAND_INFO - Land metadata with `label` and optional `icon`.
 * @param {object} content.SLOT_INFO - Slot metadata with `label` and optional `icon`.
 * @param {object} content.PASSIVE_INFO - Passive metadata with `label` and optional `icon`.
 * @param {Array<object>} content.PHASES - Array of phase objects; used to derive the `upkeep` descriptor from the phase with `id === 'upkeep'`.
 * @returns {object} An object with keys `population`, `land`, `slot`, `passive`, and `upkeep`, each a descriptor containing `label`, optional `icon`, and optional `description`.
 */
function createAssetMetadata(content) {
	const upkeepPhase = findUpkeepPhase(content.PHASES);
	return {
		population: createDescriptor(
			content.POPULATION_INFO.label,
			content.POPULATION_INFO.icon,
			content.POPULATION_INFO.description,
		),
		land: createDescriptor(content.LAND_INFO.label, content.LAND_INFO.icon),
		slot: createDescriptor(content.SLOT_INFO.label, content.SLOT_INFO.icon),
		passive: createDescriptor(
			content.PASSIVE_INFO.label,
			content.PASSIVE_INFO.icon,
		),
		upkeep: createDescriptor(upkeepPhase?.label, upkeepPhase?.icon),
	};
}

/**
 * Create a deep copy of the overview content from a content module.
 * @param {object} content - Module export object that contains an `OVERVIEW_CONTENT` property.
 * @returns {*} A deep-cloned copy of `content.OVERVIEW_CONTENT`.
 */
function createOverviewContentSnapshot(content) {
	return structuredClone(content.OVERVIEW_CONTENT);
}

/**
 * Create a plain object mapping registry entry IDs to deep-cloned definitions.
 * @param {Object} registry - An object exposing entries(), which yields [id, definition] pairs.
 * @returns {Object} An object whose keys are entry IDs and whose values are deep-cloned entry definitions.
 */
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

/**
 * Build a metadata snapshot used by the default registry from serialized registries and loaded content.
 *
 * @param {Object} registries - Serialized registries produced by createRegistries (contains actions, buildings, developments, populations, resources).
 * @param {Object} content - Loaded content modules providing RESOURCES, STATS, PHASES, TRIGGER_INFO and related content (including population and overview data).
 * @returns {Object} An aggregated metadata object with the following properties: `passiveEvaluationModifiers`, `resources`, `populations`, `buildings`, `developments`, `stats`, `phases`, `triggers`, `assets`, and `overviewContent`.
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
		overviewContent: createOverviewContentSnapshot(content),
	};
}

/**
 * Generate and write a metadata snapshot for default registries.
 *
 * Loads content modules, builds registries and metadata, writes the snapshot
 * JSON to ../packages/web/src/contexts/defaultRegistryMetadata.json, and logs a success message.
 */
async function main() {
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