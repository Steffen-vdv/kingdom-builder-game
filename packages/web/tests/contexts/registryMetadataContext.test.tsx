import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	Registry,
	actionCategorySchema,
	type ActionCategoryConfig,
} from '@kingdom-builder/protocol';
import type {
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import {
	RegistryMetadataProvider,
	useRegistryMetadata,
	useResourceMetadata,
	useActionCategoryMetadata,
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
	const category: ActionCategoryConfig = {
		id: nextKey('category'),
		title: 'Arcane',
		subtitle: 'Arcane Ops',
		icon: '🔮',
		order: 1,
		layout: 'list',
		hideWhenEmpty: false,
	};
	const actionCategories = new Registry<ActionCategoryConfig>(
		actionCategorySchema.passthrough(),
	);
	actionCategories.add(category.id, category);
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
			// Populations and stats are unified under resources in V2 system
			[population.id]: { label: 'Astral Council', icon: '✨' },
			[statId]: { label: 'Resolve', icon: '🔥' },
		},
		actionCategories: {
			[category.id]: { label: 'Arcane Actions', icon: '🔮' },
		},
		buildings: {
			[building.id]: { label: 'Sky Bastion Prime', icon: '🏯' },
		},
		developments: {
			[development.id]: { label: 'Celestial Garden', icon: '🌿' },
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
				text: 'Ignite at dawn',
			},
		},
		assets: {
			land: { label: 'Territory', icon: '🗺️' },
			slot: { label: 'Sky Dock', icon: '🛠️' },
			passive: { label: 'Aura', icon: '✨' },
		},
		overviewContent: {
			hero: { title: 'Game Overview', tokens: {} },
			sections: [],
			tokens: {},
		},
	};
	const registries: SessionRegistries = {
		actions: factory.actions,
		actionCategories,
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
	resources: MetadataSelector<RegistryMetadataDescriptor>;
	// Populations and stats are unified under resources in V2 system
	actionCategories: MetadataSelector<RegistryMetadataDescriptor>;
	buildings: MetadataSelector<RegistryMetadataDescriptor>;
	developments: MetadataSelector<RegistryMetadataDescriptor>;
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
				resources: useResourceMetadata(),
				// Populations and stats are unified under resources in V2 system
				actionCategories: useActionCategoryMetadata(),
				buildings: useBuildingMetadata(),
				developments: useDevelopmentMetadata(),
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
			resources,
			// populations and stats removed - unified under resources in V2 system
			actionCategories,
			buildings,
			developments,
			phases,
			triggers,
			land,
			slot,
			passive,
		} = captured;
		const { actionId, buildingId, developmentId, populationId, resourceKey } =
			setup;
		expect(context.actions.getOrThrow(actionId).id).toBe(actionId);
		expect(context.actionCategories.getOrThrow(setup.categoryId).id).toBe(
			setup.categoryId,
		);
		expect(context.buildings.getOrThrow(buildingId).id).toBe(buildingId);
		expect(context.developments.getOrThrow(developmentId).id).toBe(
			developmentId,
		);
		// Populations unified under resources in V2 - use resourceMetadata instead
		expect(context.resources.getOrThrow(resourceKey)).toEqual(setup.resource);
		expect(context.buildings.keys()).toContain(buildingId);
		expect(context.developments.values().map((item) => item.id)).toContain(
			developmentId,
		);
		expect(context.actionCategories.get(setup.categoryId)?.title).toBe(
			'Arcane',
		);
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
		// Populations unified under resources in V2 - check via resources
		expect(resources.byId[populationId]?.label).toBe('Astral Council');
		expect(actionCategories.byId[setup.categoryId].label).toBe(
			'Arcane Actions',
		);
		expect(buildings.byId[buildingId].label).toBe('Sky Bastion Prime');
		expect(developments.byId[developmentId].label).toBe('Celestial Garden');
		// Stats are unified under resources in V2
		expect(resources.select(setup.statId).icon).toBe('🔥');
		const fallbackStatId = nextKey('stat');
		expect(resources.select(fallbackStatId).label).toBe(
			formatFallbackLabel(fallbackStatId),
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
		expect(trigger.text).toBe('Ignite at dawn');
		expect(trigger.label).toBe('Ignition Trigger');
		// Triggers now throw for missing metadata (strictness principle)
		const fallbackTriggerId = nextKey('trigger');
		expect(() => triggers.select(fallbackTriggerId)).toThrow(
			`Trigger "${fallbackTriggerId}" is missing a label`,
		);
		const phaseRecord = phases.selectRecord([setup.phaseId, fallbackPhaseId]);
		expect(phaseRecord[setup.phaseId]).toBe(phaseDescriptor);
		expect(Object.isFrozen(phaseRecord)).toBe(true);
		expect(land.descriptor.label).toBe('Territory');
		expect(land.select()).toBe(land.descriptor);
		expect(passive.descriptor.label).toBe('Aura');
		expect(slot.descriptor.label).toBe('Sky Dock');
		expect(context.overviewContent.hero.title).toBe('Game Overview');
	});

	it('throws when metadata is missing', () => {
		const setup = createTestSetup();
		expect(() =>
			renderToStaticMarkup(
				<RegistryMetadataProvider registries={setup.registries}>
					<div />
				</RegistryMetadataProvider>,
			),
		).toThrowError(
			'RegistryMetadataProvider requires metadata with asset and overview descriptors.',
		);
	});

	it('does not require stats metadata (regression: stats unified under resources)', () => {
		// This test ensures the metadata hooks work without a 'stats' key
		// since stats are unified under resources in ResourceV2.
		// See: "Session snapshot metadata is missing the 'stats' descriptors" error
		const factory = createContentFactory();
		const statId = nextKey('stat');
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			// Note: NO 'stats' key - stats are in resources now
			resources: {
				[statId]: { label: 'Army Strength', icon: '⚔️' },
			},
			buildings: {},
			developments: {},
			phases: {},
			triggers: {},
			assets: {
				land: { label: 'Land', icon: '🗺️' },
				slot: { label: 'Slot', icon: '🧩' },
				passive: { label: 'Passive', icon: '✨' },
			},
			overviewContent: {
				hero: { title: 'Test', tokens: {} },
				sections: [],
				tokens: {},
			},
		};
		const registries: SessionRegistries = {
			actions: factory.actions,
			actionCategories: new Registry<ActionCategoryConfig>(
				actionCategorySchema.passthrough(),
			),
			buildings: factory.buildings,
			developments: factory.developments,
			populations: factory.populations,
			resources: {},
		};

		let stats: MetadataSelector<RegistryMetadataDescriptor> | null = null;
		const Capture = () => {
			stats = useStatMetadata();
			return null;
		};

		// Should NOT throw - stats are accessed via resources, not a separate key
		expect(() =>
			renderToStaticMarkup(
				<RegistryMetadataProvider registries={registries} metadata={metadata}>
					<Capture />
				</RegistryMetadataProvider>,
			),
		).not.toThrow();

		// Stats should be accessible via the unified resource metadata
		expect(stats).not.toBeNull();
		expect(stats!.select(statId).label).toBe('Army Strength');
		expect(stats!.select(statId).icon).toBe('⚔️');
	});
});
