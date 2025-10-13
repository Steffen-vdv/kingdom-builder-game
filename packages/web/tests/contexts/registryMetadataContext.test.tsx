import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
        SessionResourceDefinition,
        SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { OverviewContentTemplate } from '../src/components/overview/overviewContentTypes';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
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
import { createSessionRegistries } from '../helpers/sessionRegistries';
import { createDefaultRegistryMetadata } from '../helpers/defaultRegistrySnapshot';

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
        const [resourceKey] = Object.keys(registries.resources);
        if (
                !actionId ||
                !buildingId ||
                !developmentId ||
                !populationId ||
                !resourceKey
        ) {
                throw new Error('Expected registries to contain baseline entries.');
        }
        const resource = registries.resources[resourceKey];
        if (!resource) {
                throw new Error('Failed to resolve a resource definition.');
        }
        const [statId] = Object.keys(metadata.stats ?? {});
        if (!statId) {
                throw new Error('Expected default metadata to include stat descriptors.');
        }
        const [phaseEntry] = Object.entries(metadata.phases ?? {});
        if (!phaseEntry) {
                throw new Error('Expected default metadata to include phase descriptors.');
        }
        const [phaseId, phaseMetadata] = phaseEntry;
        const phaseStepId = phaseMetadata.steps?.[0]?.id ?? `${phaseId}:step`;
        const triggerIds = new Set(
                phaseMetadata.steps?.flatMap((step) => step.triggers ?? []) ?? [],
        );
        const triggerEntries = Object.entries(metadata.triggers ?? {});
        const [fallbackTriggerId] = triggerEntries[0] ?? [];
        const triggerId = [...triggerIds][0] ?? fallbackTriggerId;
        if (!triggerId) {
                throw new Error('Expected default metadata to include trigger descriptors.');
        }
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
                const expectedResource = setup.metadata.resources?.[resourceKey];
                expect(resourceDescriptor.label).toBe(
                        expectedResource?.label ?? formatFallbackLabel(resourceKey),
                );
                if (expectedResource?.description) {
                        expect(resourceDescriptor.description).toBe(
                                expectedResource.description,
                        );
                }
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
                expect(populations.byId[populationId].label).toBe(
                        setup.metadata.populations?.[populationId]?.label,
                );
                expect(buildings.byId[buildingId].label).toBe(
                        setup.metadata.buildings?.[buildingId]?.label,
                );
                expect(developments.byId[developmentId].label).toBe(
                        setup.metadata.developments?.[developmentId]?.label,
                );
                expect(stats.select(setup.statId).icon).toBe(
                        setup.metadata.stats?.[setup.statId]?.icon,
                );
                const fallbackStatId = nextKey('stat');
                expect(stats.select(fallbackStatId).label).toBe(
                        formatFallbackLabel(fallbackStatId),
                );
                const phaseDescriptor = phases.select(setup.phaseId);
                expect(phaseDescriptor.label).toBe(
                        setup.metadata.phases?.[setup.phaseId]?.label ?? '',
                );
                expect(phaseDescriptor.action).toBe(
                        setup.metadata.phases?.[setup.phaseId]?.action ?? false,
                );
                const step = phaseDescriptor.stepsById[setup.phaseStepId];
                const expectedPhase = setup.metadata.phases?.[setup.phaseId];
                const expectedStep = expectedPhase?.steps?.find(
                        (entry) => entry.id === setup.phaseStepId,
                );
                expect(step?.label).toBe(expectedStep?.label ?? formatFallbackLabel(step?.id ?? ''));
                expect(step?.triggers).toEqual(expectedStep?.triggers ?? []);
                const fallbackPhaseId = nextKey('phase');
                const fallbackPhase = phases.select(fallbackPhaseId);
                expect(fallbackPhase.steps).toHaveLength(0);
                expect(fallbackPhase.action).toBe(false);
                const trigger = triggers.select(setup.triggerId);
                const expectedTrigger = setup.metadata.triggers?.[setup.triggerId];
                expect(trigger.future).toBe(expectedTrigger?.future ?? '');
                expect(trigger.past).toBe(expectedTrigger?.past ?? '');
                const fallbackTriggerId = nextKey('trigger');
                expect(triggers.select(fallbackTriggerId).label).toBe(
                        formatFallbackLabel(fallbackTriggerId),
                );
                const phaseRecord = phases.selectRecord([setup.phaseId, fallbackPhaseId]);
                expect(phaseRecord[setup.phaseId]).toBe(phaseDescriptor);
                expect(Object.isFrozen(phaseRecord)).toBe(true);
                expect(land.descriptor.label).toBe(
                        setup.metadata.assets?.land?.label ?? land.descriptor.label,
                );
                expect(land.select()).toBe(land.descriptor);
                expect(passive.descriptor.label).toBe(
                        setup.metadata.assets?.passive?.label ?? passive.descriptor.label,
                );
                expect(slot.descriptor.label).toBe(
                        setup.metadata.assets?.slot?.label ?? slot.descriptor.label,
                );
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
