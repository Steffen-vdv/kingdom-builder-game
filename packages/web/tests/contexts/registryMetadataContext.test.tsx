import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createContentFactory } from '@kingdom-builder/testing';
import type {
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import {
	DEFAULT_LAND_DESCRIPTOR,
	DEFAULT_OVERVIEW_CONTENT,
	DEFAULT_PASSIVE_DESCRIPTOR,
	DEFAULT_SLOT_DESCRIPTOR,
} from '../../src/contexts/registryMetadataDefaults';
import {
	RegistryMetadataProvider,
	useActionCategoryMetadata,
	useRegistryMetadata,
	useResourceMetadata,
	usePopulationMetadata,
	useBuildingMetadata,
	useDevelopmentMetadata,
	useStatMetadata,
	usePhaseMetadata,
	useTriggerMetadata,
	useLandMetadata,
	useSlotMetadata,
	usePassiveAssetMetadata,
	type RegistryMetadataContextValue,
	type RegistryMetadataDescriptor,
	type PhaseMetadata,
	type TriggerMetadata,
	type MetadataSelector,
	type AssetMetadataSelector,
} from '../../src/contexts/RegistryMetadataContext';
import { describe, expect, it } from 'vitest';

interface TestSetup {
	registries: SessionRegistries;
	actionId: string;
	categoryId: string;
	buildingId: string;
	developmentId: string;
	populationId: string;
	resourceKey: string;
	resource: SessionResourceDefinition;
	metadata: SessionSnapshotMetadata;
	statId: string;
	phaseId: string;
	phaseStepId: string;
	triggerId: string;
}

let sequence = 0;
const nextKey = (prefix: string) => {
	sequence += 1;
	return `${prefix}_${sequence}`;
};

function createTestSetup(): TestSetup {
	const factory = createContentFactory();
	const action = factory.action({
		name: 'Sky Assault',
		icon: '🛩️',
	});
	const category = factory.category({
		id: nextKey('category'),
		label: 'Sky Armada',
		icon: '🛩️',
	});
	const building = factory.building({
		name: 'Sky Bastion',
		icon: '🏯',
	});
	const development = factory.development({
		name: 'Celestial Garden',
		icon: '🌿',
	});
	const population = factory.population({
		name: 'Astral Council',
		icon: '✨',
	});
	const resourceKey = nextKey('resource');
	const resource: SessionResourceDefinition = {
		key: resourceKey,
		label: 'Starlight',
		icon: '🌟',
		description: 'Rare energy gathered from the firmament.',
	};
	const statId = nextKey('stat');
	const phaseId = nextKey('phase');
	const phaseStepId = nextKey('step');
	const triggerId = nextKey('trigger');
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources: {
			[resourceKey]: {
				label: 'Auric Light',
				icon: '💡',
				description: 'Condensed radiance.',
			},
		},
		populations: {
			[population.id]: { label: 'Astral Council', icon: '✨' },
		},
		buildings: {
			[building.id]: { label: 'Sky Bastion Prime', icon: '🏯' },
		},
		developments: {
			[development.id]: { label: 'Celestial Garden', icon: '🌿' },
		},
		stats: {
			[statId]: { label: 'Resolve', icon: '🔥' },
		},
		phases: {
			[phaseId]: {
				label: 'Ascension',
				icon: '🚀',
				action: true,
				steps: [
					{
						id: phaseStepId,
						label: 'Ignition',
						icon: '🔥',
						triggers: ['ignite'],
					},
				],
			},
		},
		triggers: {
			[triggerId]: {
				label: 'Ignition Trigger',
				icon: '🔥',
				future: 'Ignite at dawn',
				past: 'Ignition complete',
			},
		},
		assets: {
			land: { label: 'Territory', icon: '🗺️' },
			passive: { label: 'Aura', icon: '✨' },
		},
	};
	const registries: SessionRegistries = {
		actions: factory.actions,
		actionCategories: factory.categories,
		buildings: factory.buildings,
		developments: factory.developments,
		populations: factory.populations,
		resources: { [resourceKey]: resource },
	};
	return {
		registries,
		actionId: action.id,
		categoryId: category.id,
		buildingId: building.id,
		developmentId: development.id,
		populationId: population.id,
		resourceKey,
		resource,
		metadata,
		statId,
		phaseId,
		phaseStepId,
		triggerId,
	};
}

interface CapturedLookups {
	context: RegistryMetadataContextValue;
	categories: MetadataSelector<RegistryMetadataDescriptor>;
	resources: MetadataSelector<RegistryMetadataDescriptor>;
	populations: MetadataSelector<RegistryMetadataDescriptor>;
	buildings: MetadataSelector<RegistryMetadataDescriptor>;
	developments: MetadataSelector<RegistryMetadataDescriptor>;
	stats: MetadataSelector<RegistryMetadataDescriptor>;
	phases: MetadataSelector<PhaseMetadata>;
	triggers: MetadataSelector<TriggerMetadata>;
	land: AssetMetadataSelector;
	slot: AssetMetadataSelector;
	passive: AssetMetadataSelector;
}

const formatFallbackLabel = (value: string): string => {
	const spaced = value.replace(/[_-]+/g, ' ').trim();
	if (spaced.length === 0) {
		return value;
	}
	return spaced.replace(/\b\w/g, (char) => char.toUpperCase());
};

describe('RegistryMetadataProvider', () => {
	it('provides memoized metadata lookups for registries', () => {
		const setup = createTestSetup();
		let captured: CapturedLookups | null = null;
		const Capture = () => {
			captured = {
				context: useRegistryMetadata(),
				categories: useActionCategoryMetadata(),
				resources: useResourceMetadata(),
				populations: usePopulationMetadata(),
				buildings: useBuildingMetadata(),
				developments: useDevelopmentMetadata(),
				stats: useStatMetadata(),
				phases: usePhaseMetadata(),
				triggers: useTriggerMetadata(),
				land: useLandMetadata(),
				slot: useSlotMetadata(),
				passive: usePassiveAssetMetadata(),
			};
			return null;
		};
		renderToStaticMarkup(
			<RegistryMetadataProvider
				registries={setup.registries}
				metadata={setup.metadata}
			>
				<Capture />
			</RegistryMetadataProvider>,
		);
		if (!captured) {
			throw new Error('Registry metadata context was not captured.');
		}
		const {
			context,
			categories,
			resources,
			populations,
			buildings,
			developments,
			stats,
			phases,
			triggers,
			land,
			slot,
			passive,
		} = captured;
		const {
			actionId,
			categoryId,
			buildingId,
			developmentId,
			populationId,
			resourceKey,
		} = setup;
		expect(context.actions.getOrThrow(actionId).id).toBe(actionId);
		expect(context.actionCategories.getOrThrow(categoryId).id).toBe(categoryId);
		expect(context.buildings.getOrThrow(buildingId).id).toBe(buildingId);
		expect(context.developments.getOrThrow(developmentId).id).toBe(
			developmentId,
		);
		expect(context.populations.getOrThrow(populationId).id).toBe(populationId);
		expect(context.resources.getOrThrow(resourceKey)).toEqual(setup.resource);
		expect(context.buildings.keys()).toContain(buildingId);
		expect(context.developments.values().map((item) => item.id)).toContain(
			developmentId,
		);
		expect(context.populations.has(nextKey('population'))).toBe(false);
		const resourceDescriptor = resources.byId[resourceKey];
		expect(resourceDescriptor.label).toBe('Auric Light');
		expect(resourceDescriptor.description).toBe('Condensed radiance.');
		const fallbackResourceId = nextKey('resource');
		expect(resources.select(fallbackResourceId).label).toBe(
			formatFallbackLabel(fallbackResourceId),
		);
		const selectedResources = resources.selectMany([
			resourceKey,
			fallbackResourceId,
		]);
		expect(selectedResources[0]).toBe(resourceDescriptor);
		expect(selectedResources[1].label).toBe(
			formatFallbackLabel(fallbackResourceId),
		);
		const resourceRecord = resources.selectRecord([
			resourceKey,
			fallbackResourceId,
		]);
		expect(resourceRecord[resourceKey]).toBe(resourceDescriptor);
		expect(Object.isFrozen(selectedResources)).toBe(true);
		expect(Object.isFrozen(resourceRecord)).toBe(true);
		expect(populations.byId[populationId].label).toBe('Astral Council');
		expect(buildings.byId[buildingId].label).toBe('Sky Bastion Prime');
		expect(developments.byId[developmentId].label).toBe('Celestial Garden');
		expect(stats.select(setup.statId).icon).toBe('🔥');
		const fallbackStatId = nextKey('stat');
		expect(stats.select(fallbackStatId).label).toBe(
			formatFallbackLabel(fallbackStatId),
		);
		const categoryDescriptor = categories.select(categoryId);
		expect(categoryDescriptor.label).toBe('Sky Armada');
		const fallbackCategoryId = nextKey('category');
		expect(categories.select(fallbackCategoryId).label).toBe(
			formatFallbackLabel(fallbackCategoryId),
		);
		const phaseDescriptor = phases.select(setup.phaseId);
		expect(phaseDescriptor.label).toBe('Ascension');
		expect(phaseDescriptor.action).toBe(true);
		const step = phaseDescriptor.stepsById[setup.phaseStepId];
		expect(step.label).toBe('Ignition');
		expect(step.triggers).toEqual(['ignite']);
		const fallbackPhaseId = nextKey('phase');
		const fallbackPhase = phases.select(fallbackPhaseId);
		expect(fallbackPhase.steps).toHaveLength(0);
		expect(fallbackPhase.action).toBe(false);
		const trigger = triggers.select(setup.triggerId);
		expect(trigger.future).toBe('Ignite at dawn');
		expect(trigger.past).toBe('Ignition complete');
		const fallbackTriggerId = nextKey('trigger');
		expect(triggers.select(fallbackTriggerId).label).toBe(
			formatFallbackLabel(fallbackTriggerId),
		);
		const phaseRecord = phases.selectRecord([setup.phaseId, fallbackPhaseId]);
		expect(phaseRecord[setup.phaseId]).toBe(phaseDescriptor);
		expect(Object.isFrozen(phaseRecord)).toBe(true);
		expect(land.descriptor.label).toBe('Territory');
		expect(land.select()).toBe(land.descriptor);
		expect(passive.descriptor.label).toBe('Aura');
		expect(slot.descriptor.label).toBe('Development Slot');
		expect(context.actionCategoryMetadata).toBe(categories);
		expect(context.overviewContent.hero.title).toBe('Game Overview');
	});

	it('falls back to default metadata when snapshot metadata is missing', () => {
		const setup = createTestSetup();
		let captured: {
			slot: AssetMetadataSelector;
			land: AssetMetadataSelector;
			passive: AssetMetadataSelector;
			overviewTitle: string | undefined;
		} | null = null;
		const Capture = () => {
			const { overviewContent } = useRegistryMetadata();
			captured = {
				land: useLandMetadata(),
				slot: useSlotMetadata(),
				passive: usePassiveAssetMetadata(),
				overviewTitle: overviewContent.hero?.title,
			};
			return null;
		};
		renderToStaticMarkup(
			<RegistryMetadataProvider registries={setup.registries}>
				<Capture />
			</RegistryMetadataProvider>,
		);
		if (!captured) {
			throw new Error('Registry metadata context was not captured.');
		}
		expect(captured.land.descriptor).toEqual(DEFAULT_LAND_DESCRIPTOR);
		expect(captured.slot.descriptor).toEqual(DEFAULT_SLOT_DESCRIPTOR);
		expect(captured.passive.descriptor).toEqual(DEFAULT_PASSIVE_DESCRIPTOR);
		expect(captured.overviewTitle).toBe(DEFAULT_OVERVIEW_CONTENT.hero?.title);
	});
});
