import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import type {
	PhaseConfig,
	SerializedRegistry,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol';
import { buildSessionMetadata } from '../../src/session/buildSessionMetadata.js';

describe('buildSessionMetadata', () => {
	const createTestResources =
		(): SerializedRegistry<SessionResourceDefinition> => ({
			'resource:test:full': {
				key: 'resource:test:full',
				label: 'Full Resource',
				icon: '💎',
				description: 'A resource with all fields',
			},
			'resource:test:minimal': {
				key: 'resource:test:minimal',
			},
			'resource:test:label-only': {
				key: 'resource:test:label-only',
				label: 'Label Only',
			},
			'resource:test:icon-only': {
				key: 'resource:test:icon-only',
				icon: '🔮',
			},
		});

	const createTestPhases = (): PhaseConfig[] => [
		{
			id: 'phase.full',
			label: 'Full Phase',
			icon: '🎯',
			action: true,
			steps: [
				{
					id: 'phase.full.step1',
					title: 'Step One',
					icon: '1️⃣',
					triggers: ['trigger.test'],
				},
				{
					id: 'phase.full.step2',
					title: 'Step Two',
				},
			],
		},
		{
			id: 'phase.minimal',
			steps: [{ id: 'phase.minimal.step' }],
		},
		{
			id: 'phase.no-steps',
			steps: [],
		},
	];

	it('builds metadata from registries and phases', () => {
		const factory = createContentFactory();
		const resources = createTestResources();
		const phases = createTestPhases();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources,
			phases,
		});
		expect(metadata).toBeDefined();
		expect(metadata.resources).toBeDefined();
		expect(metadata.phases).toBeDefined();
	});

	it('handles resources with all optional fields', () => {
		const factory = createContentFactory();
		const resources = createTestResources();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources,
			phases: [],
		});
		const fullResource = metadata.resources?.['resource:test:full'];
		expect(fullResource?.label).toBe('Full Resource');
		expect(fullResource?.icon).toBe('💎');
		expect(fullResource?.description).toBe('A resource with all fields');
	});

	it('handles resources with no optional fields', () => {
		const factory = createContentFactory();
		const resources = createTestResources();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources,
			phases: [],
		});
		const minimalResource = metadata.resources?.['resource:test:minimal'];
		expect(minimalResource).toBeDefined();
		expect(minimalResource?.label).toBeUndefined();
		expect(minimalResource?.icon).toBeUndefined();
		expect(minimalResource?.description).toBeUndefined();
	});

	it('handles resources with only label', () => {
		const factory = createContentFactory();
		const resources = createTestResources();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources,
			phases: [],
		});
		const labelOnlyResource = metadata.resources?.['resource:test:label-only'];
		expect(labelOnlyResource?.label).toBe('Label Only');
		expect(labelOnlyResource?.icon).toBeUndefined();
	});

	it('handles resources with only icon', () => {
		const factory = createContentFactory();
		const resources = createTestResources();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources,
			phases: [],
		});
		const iconOnlyResource = metadata.resources?.['resource:test:icon-only'];
		expect(iconOnlyResource?.icon).toBe('🔮');
		expect(iconOnlyResource?.label).toBeUndefined();
	});

	it('builds phase metadata with all optional fields', () => {
		const factory = createContentFactory();
		const phases = createTestPhases();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases,
		});
		const fullPhase = metadata.phases?.['phase.full'];
		expect(fullPhase?.id).toBe('phase.full');
		expect(fullPhase?.label).toBe('Full Phase');
		expect(fullPhase?.icon).toBe('🎯');
		expect(fullPhase?.action).toBe(true);
		expect(fullPhase?.steps).toHaveLength(2);
	});

	it('builds phase metadata with minimal fields', () => {
		const factory = createContentFactory();
		const phases = createTestPhases();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases,
		});
		const minimalPhase = metadata.phases?.['phase.minimal'];
		expect(minimalPhase?.id).toBe('phase.minimal');
		expect(minimalPhase?.label).toBeUndefined();
		expect(minimalPhase?.icon).toBeUndefined();
		expect(minimalPhase?.action).toBeUndefined();
		expect(minimalPhase?.steps).toHaveLength(1);
	});

	it('omits steps for phases with empty step arrays', () => {
		const factory = createContentFactory();
		const phases = createTestPhases();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases,
		});
		const noStepsPhase = metadata.phases?.['phase.no-steps'];
		expect(noStepsPhase?.id).toBe('phase.no-steps');
		expect(noStepsPhase?.steps).toBeUndefined();
	});

	it('builds step metadata with all optional fields', () => {
		const factory = createContentFactory();
		const phases = createTestPhases();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases,
		});
		const fullPhase = metadata.phases?.['phase.full'];
		const step1 = fullPhase?.steps?.[0];
		expect(step1?.id).toBe('phase.full.step1');
		expect(step1?.label).toBe('Step One');
		expect(step1?.icon).toBe('1️⃣');
		expect(step1?.triggers).toEqual(['trigger.test']);
	});

	it('builds step metadata with minimal fields', () => {
		const factory = createContentFactory();
		const phases = createTestPhases();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases,
		});
		const minimalPhase = metadata.phases?.['phase.minimal'];
		const step = minimalPhase?.steps?.[0];
		expect(step?.id).toBe('phase.minimal.step');
		expect(step?.label).toBeUndefined();
		expect(step?.icon).toBeUndefined();
		expect(step?.triggers).toBeUndefined();
	});

	it('builds step metadata without triggers when array is empty', () => {
		const factory = createContentFactory();
		const phases: PhaseConfig[] = [
			{
				id: 'phase.empty-triggers',
				steps: [{ id: 'step', triggers: [] }],
			},
		];
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases,
		});
		const phase = metadata.phases?.['phase.empty-triggers'];
		const step = phase?.steps?.[0];
		expect(step?.triggers).toBeUndefined();
	});

	it('builds building metadata with name and icon', () => {
		const factory = createContentFactory();
		const building = factory.building({
			name: 'Test Building',
			icon: '🏛️',
		});
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases: [],
		});
		const buildingMeta = metadata.buildings?.[building.id];
		expect(buildingMeta?.label).toBe('Test Building');
		expect(buildingMeta?.icon).toBe('🏛️');
	});

	it('builds building metadata without optional icon and description', () => {
		const factory = createContentFactory();
		const building = factory.building({ name: 'Minimal Building' });
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases: [],
		});
		const buildingMeta = metadata.buildings?.[building.id];
		expect(buildingMeta?.label).toBe('Minimal Building');
		expect(buildingMeta?.icon).toBeUndefined();
		expect(buildingMeta?.description).toBeUndefined();
	});

	it('builds development metadata with name and icon', () => {
		const factory = createContentFactory();
		const development = factory.development({
			name: 'Test Development',
			icon: '🌳',
		});
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases: [],
		});
		const devMeta = metadata.developments?.[development.id];
		expect(devMeta?.label).toBe('Test Development');
		expect(devMeta?.icon).toBe('🌳');
	});

	it('builds population resource metadata when resources include population entries', () => {
		const factory = createContentFactory();
		// Create a population resource entry
		const resources: SerializedRegistry<SessionResourceDefinition> = {
			'resource:population:role:test': {
				key: 'resource:population:role:test',
				label: 'Test Population',
				icon: '👤',
				description: 'Test population resource',
			},
		};
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources,
			phases: [],
		});
		// Population resources should be included in the resources metadata
		const popMeta = metadata.resources?.['resource:population:role:test'];
		expect(popMeta).toBeDefined();
		expect(popMeta?.label).toBe('Test Population');
		expect(popMeta?.icon).toBe('👤');
	});

	it('includes trigger metadata from TRIGGER_META', () => {
		const factory = createContentFactory();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases: [],
		});
		expect(metadata.triggers).toBeDefined();
		expect(Object.keys(metadata.triggers ?? {}).length).toBeGreaterThan(0);
	});

	it('includes asset metadata entries', () => {
		const factory = createContentFactory();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases: [],
		});
		expect(metadata.assets).toBeDefined();
		expect(metadata.assets?.population).toBeDefined();
		expect(metadata.assets?.passive).toBeDefined();
		expect(metadata.assets?.land).toBeDefined();
		expect(metadata.assets?.slot).toBeDefined();
		expect(metadata.assets?.upkeep).toBeDefined();
		expect(metadata.assets?.transfer).toBeDefined();
	});

	it('includes core stat resources in resource metadata', () => {
		const factory = createContentFactory();
		// Create a core stat resource
		const resources: SerializedRegistry<SessionResourceDefinition> = {
			'resource:core:test-stat': {
				key: 'resource:core:test-stat',
				label: 'Test Stat',
				icon: '📊',
				displayAsPercent: true,
			},
		};
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources,
			phases: [],
		});
		// Core resources should be in the resources metadata
		const statMeta = metadata.resources?.['resource:core:test-stat'];
		expect(statMeta).toBeDefined();
		expect(statMeta?.label).toBe('Test Stat');
		expect(statMeta?.icon).toBe('📊');
	});

	it('includes overview content clone', () => {
		const factory = createContentFactory();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases: [],
		});
		expect(metadata.overview).toBeDefined();
		expect(metadata.overview?.hero).toBeDefined();
	});

	it('omits resources section when resource registry is empty', () => {
		const factory = createContentFactory();
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources: {},
			phases: [],
		});
		// Even with empty resources, metadata.resources may still be set
		// because of how hasEntries works - it checks if the object has keys
		expect(metadata.resources).toBeUndefined();
	});

	it('skips undefined resource definitions', () => {
		const factory = createContentFactory();
		const resources: SerializedRegistry<SessionResourceDefinition> = {
			'resource:valid': {
				key: 'resource:valid',
				label: 'Valid',
			},
		};
		// Add an undefined entry (simulating sparse registry)
		(resources as Record<string, unknown>)['resource:undefined'] = undefined;
		const metadata = buildSessionMetadata({
			buildings: factory.buildings,
			developments: factory.developments,
			resources,
			phases: [],
		});
		expect(metadata.resources?.['resource:valid']).toBeDefined();
		expect(metadata.resources?.['resource:undefined']).toBeUndefined();
	});
});
