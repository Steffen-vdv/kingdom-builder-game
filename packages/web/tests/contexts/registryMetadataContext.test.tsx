import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
	SessionResourceDefinition,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { OverviewContentTemplate } from '../src/components/overview/overviewContentTypes';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import {
	createSessionRegistries,
	createDefaultRegistryMetadata,
} from '../helpers/sessionRegistries';
import {
	RegistryMetadataProvider,
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
	buildingId: string;
	developmentId: string;
	populationId: string;
	resourceKey: string;
	resource: SessionResourceDefinition;
	metadata: SessionSnapshotMetadata & {
		overviewContent?: OverviewContentTemplate;
	};
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
	const registries = createSessionRegistries();
	const metadata = createDefaultRegistryMetadata();
	const [actionId] = registries.actions.keys();
	const [buildingId] = registries.buildings.keys();
	const [developmentId] = registries.developments.keys();
	const [populationId] = registries.populations.keys();
	const resourceKeys = Object.keys(registries.resources);
	const statKeys = Object.keys(metadata.stats ?? {});
	const phaseId = 'main';
	const phaseSteps = metadata.phases?.[phaseId]?.steps ?? [];
	const phaseStepId = phaseSteps[0]?.id ?? `${phaseId}:step:0`;
	const triggerId = 'ignite';
	if (
		!actionId ||
		!buildingId ||
		!developmentId ||
		!populationId ||
		resourceKeys.length === 0 ||
		statKeys.length === 0 ||
		!metadata.phases?.[phaseId]
	) {
		throw new Error(
			'Expected default registries and metadata to provide entries.',
		);
	}
	const resourceKey = resourceKeys[0];
	const resource: SessionResourceDefinition = {
		key: resourceKey,
		label: 'Starlight',
		icon: '🌟',
		description: 'Condensed radiance.',
	};
	registries.resources[resourceKey] = resource;
	metadata.passiveEvaluationModifiers =
		metadata.passiveEvaluationModifiers ?? {};
	metadata.resources = {
		...metadata.resources,
		[resourceKey]: {
			...metadata.resources?.[resourceKey],
			label: 'Auric Light',
			icon: '💡',
			description: 'Condensed radiance.',
		},
	};
	metadata.populations = {
		...metadata.populations,
		[populationId]: { label: 'Astral Council', icon: '✨' },
	};
	metadata.buildings = {
		...metadata.buildings,
		[buildingId]: { label: 'Sky Bastion Prime', icon: '🏯' },
	};
	metadata.developments = {
		...metadata.developments,
		[developmentId]: { label: 'Celestial Garden', icon: '🌿' },
	};
	const statId = statKeys[0];
	metadata.stats = {
		...metadata.stats,
		[statId]: { label: 'Resolve', icon: '🔥' },
	};
	metadata.phases = {
		...metadata.phases,
		[phaseId]: {
			id: phaseId,
			label: 'Ascension',
			icon: '🚀',
			action: true,
			steps: [
				{
					id: phaseStepId,
					label: 'Ignition',
					icon: '🔥',
					triggers: [triggerId],
				},
			],
		},
	};
	metadata.triggers = {
		...metadata.triggers,
		[triggerId]: {
			label: 'Ignition Trigger',
			icon: '🔥',
			future: 'Ignite at dawn',
			past: 'Ignition complete',
		},
	};
	metadata.assets = {
		...metadata.assets,
		land: { label: 'Territory', icon: '🗺️' },
		passive: { label: 'Aura', icon: '✨' },
	};
	return {
		registries,
		actionId,
		buildingId,
		developmentId,
		populationId,
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
		const { actionId, buildingId, developmentId, populationId, resourceKey } =
			setup;
		expect(context.actions.getOrThrow(actionId).id).toBe(actionId);
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
		expect(context.overviewContent.hero.title).toBe('Game Overview');
		expect(Object.isFrozen(context.overviewContent)).toBe(true);
	});

	it('prefers overview content supplied through metadata', () => {
		const setup = createTestSetup();
		const customOverview: OverviewContentTemplate = {
			hero: {
				badgeIcon: '🧭',
				badgeLabel: 'Scout the Realm',
				title: 'Charted Territories',
				intro: 'Navigate the frontier with a pioneering spirit.',
				paragraph: 'Every expedition reveals new wonders.',
				tokens: { journey: 'Expedition' },
			},
			sections: [
				{
					kind: 'paragraph',
					id: 'introduction',
					icon: 'compass',
					title: 'First Steps',
					paragraphs: ['Begin with a single stride into the unknown.'],
				},
			],
			tokens: {
				static: { map: ['map'] },
			},
		};
		const metadata = {
			...setup.metadata,
			overviewContent: customOverview,
		};
		let captured: RegistryMetadataContextValue | null = null;
		const Capture = () => {
			captured = useRegistryMetadata();
			return null;
		};
		renderToStaticMarkup(
			<RegistryMetadataProvider
				registries={setup.registries}
				metadata={metadata}
			>
				<Capture />
			</RegistryMetadataProvider>,
		);
		if (!captured) {
			throw new Error('Registry metadata context was not captured.');
		}
		expect(captured.overviewContent).toBe(customOverview);
		expect(captured.overviewContent.hero.title).toBe('Charted Territories');
	});
});
