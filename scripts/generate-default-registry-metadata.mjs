import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createActionRegistry } from '../packages/contents/dist/actions.js';
import { createBuildingRegistry } from '../packages/contents/dist/buildings.js';
import { createDevelopmentRegistry } from '../packages/contents/dist/developments.js';
import { createPopulationRegistry } from '../packages/contents/dist/populations.js';
import { LAND_INFO, SLOT_INFO } from '../packages/contents/dist/land.js';
import { PASSIVE_INFO } from '../packages/contents/dist/passive.js';
import { PHASES } from '../packages/contents/dist/phases.js';
import { RESOURCES } from '../packages/contents/dist/resources.js';
import { STATS } from '../packages/contents/dist/stats.js';
import { TRIGGER_INFO } from '../packages/contents/dist/triggers.js';

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

function createResourceDefinitions() {
	return Object.fromEntries(
		Object.entries(RESOURCES).map(([key, info]) => {
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

function createResourceMetadata() {
	return Object.fromEntries(
		Object.entries(RESOURCES).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);
}

function createStatMetadata() {
	return Object.fromEntries(
		Object.entries(STATS).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);
}

function createPhaseMetadata() {
	return Object.fromEntries(
		PHASES.map((phase) => {
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

function createTriggerMetadata() {
	return Object.fromEntries(
		Object.entries(TRIGGER_INFO).map(([key, info]) => [
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

function createAssetMetadata() {
	return {
		land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
		slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
		passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
	};
}

function serializeRegistry(registry) {
	return Object.fromEntries(
		registry
			.entries()
			.map(([id, definition]) => [id, structuredClone(definition)]),
	);
}

function createRegistries() {
	return {
		actions: serializeRegistry(createActionRegistry()),
		buildings: serializeRegistry(createBuildingRegistry()),
		developments: serializeRegistry(createDevelopmentRegistry()),
		populations: serializeRegistry(createPopulationRegistry()),
		resources: createResourceDefinitions(),
	};
}

function createMetadata(registries) {
	return {
		passiveEvaluationModifiers: {},
		resources: createResourceMetadata(),
		populations: createRegistryDescriptorMap(registries.populations),
		buildings: createRegistryDescriptorMap(registries.buildings),
		developments: createRegistryDescriptorMap(registries.developments),
		stats: createStatMetadata(),
		phases: createPhaseMetadata(),
		triggers: createTriggerMetadata(),
		assets: createAssetMetadata(),
	};
}

async function main() {
	const registries = createRegistries();
	const metadata = createMetadata(registries);
	const snapshot = {
		registries,
		metadata,
	};
	const target = resolve(
		dirname(fileURLToPath(import.meta.url)),
		'../packages/web/src/contexts/defaultRegistryMetadata.json',
	);
	await writeFile(target, `${JSON.stringify(snapshot, null, '\t')}\n`);
}

await main();
