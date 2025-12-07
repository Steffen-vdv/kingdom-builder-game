import { describe, expect, it } from 'vitest';
import type {
	PhaseConfig,
	RuleSet,
	SessionResourceDefinition,
	SerializedRegistry,
	GameConfig,
} from '@kingdom-builder/protocol';
import {
	createContentFactory,
	createResourceRegistries,
	resourceDefinition,
} from '@kingdom-builder/testing';
import {
	buildResourceRegistry,
	buildSessionAssets,
	type SessionBaseOptions,
} from '../../src/session/sessionConfigAssets.js';
import {
	freezeSerializedRegistry,
	cloneRegistry,
} from '../../src/session/registryUtils.js';

describe('buildResourceRegistry', () => {
	it('populates registry from RESOURCE_REGISTRY', () => {
		// The function now populates from the global RESOURCE_REGISTRY
		const registry = buildResourceRegistry(undefined);
		// Should have entries from the global registry
		expect(registry).toBeDefined();
		expect(typeof registry).toBe('object');
		// At minimum, should have some keys from the global registry
		expect(Object.keys(registry).length).toBeGreaterThan(0);
	});

	it('applies resource overrides when provided', () => {
		const overrides: SerializedRegistry<SessionResourceDefinition> = {
			'resource:custom:test': {
				key: 'resource:custom:test',
				label: 'Custom Resource',
				icon: '🌟',
			},
		};
		const registry = buildResourceRegistry(overrides);
		expect(registry['resource:custom:test']).toBeDefined();
		expect(registry['resource:custom:test'].label).toBe('Custom Resource');
	});

	it('handles undefined overrides', () => {
		const registry = buildResourceRegistry(undefined);
		expect(registry).toBeDefined();
		expect(typeof registry).toBe('object');
	});

	it('preserves override values over registry defaults', () => {
		// Pick a known resource from registry and override it
		const overrides: SerializedRegistry<SessionResourceDefinition> = {
			'resource:core:gold': {
				key: 'resource:core:gold',
				label: 'Override Gold Label',
				icon: '💰',
			},
		};
		const registry = buildResourceRegistry(overrides);
		// Override should take precedence
		expect(registry['resource:core:gold'].label).toBe('Override Gold Label');
	});
});

describe('buildSessionAssets', () => {
	const createBaseOptions = (): SessionBaseOptions => {
		const factory = createContentFactory();
		const { resources, groups } = createResourceRegistries({
			resources: [
				resourceDefinition({
					id: 'resource:test:base',
					metadata: { label: 'Base', icon: '💎' },
				}),
			],
		});
		const phases: PhaseConfig[] = [
			{ id: 'main', action: true, steps: [{ id: 'main' }] },
		];
		const rules: RuleSet = {
			defaultActionAPCost: 1,
			absorptionCapPct: 1,
			absorptionRounding: 'down',
			tieredResourceKey: 'resource:test:base',
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 2,
			basePopulationCap: 1,
			winConditions: [],
		};
		return {
			actions: factory.actions,
			actionCategories: factory.categories,
			buildings: factory.buildings,
			developments: factory.developments,
			populations: factory.populations,
			phases,
			rules,
			resourceCatalog: { resources, groups },
		};
	};

	it('returns base assets when config is undefined', () => {
		const baseOptions = createBaseOptions();
		const baseRegistries = {
			actions: freezeSerializedRegistry(cloneRegistry(baseOptions.actions)),
			buildings: freezeSerializedRegistry(cloneRegistry(baseOptions.buildings)),
			developments: freezeSerializedRegistry(
				cloneRegistry(baseOptions.developments),
			),
			populations: freezeSerializedRegistry(
				cloneRegistry(baseOptions.populations),
			),
			resources: {} as SerializedRegistry<SessionResourceDefinition>,
			actionCategories: freezeSerializedRegistry(
				cloneRegistry(baseOptions.actionCategories),
			),
		};
		const baseMetadata = {};
		const context = {
			baseOptions,
			resourceOverrides: undefined,
			baseRegistries,
			baseMetadata,
		};
		const { registries, metadata } = buildSessionAssets(context, undefined);
		expect(registries).toBe(baseRegistries);
		expect(metadata).toBe(baseMetadata);
	});

	it('creates new registries when config is provided', () => {
		const baseOptions = createBaseOptions();
		const baseRegistries = {
			actions: freezeSerializedRegistry(cloneRegistry(baseOptions.actions)),
			buildings: freezeSerializedRegistry(cloneRegistry(baseOptions.buildings)),
			developments: freezeSerializedRegistry(
				cloneRegistry(baseOptions.developments),
			),
			populations: freezeSerializedRegistry(
				cloneRegistry(baseOptions.populations),
			),
			resources: {} as SerializedRegistry<SessionResourceDefinition>,
			actionCategories: freezeSerializedRegistry(
				cloneRegistry(baseOptions.actionCategories),
			),
		};
		const baseMetadata = {};
		const context = {
			baseOptions,
			resourceOverrides: undefined,
			baseRegistries,
			baseMetadata,
		};
		// Any non-empty GameConfig triggers new registry creation
		const config: GameConfig = {};
		const { registries, metadata } = buildSessionAssets(context, config);
		expect(registries).not.toBe(baseRegistries);
		// Resources should be populated from RESOURCE_REGISTRY
		expect(registries.resources).toBeDefined();
		expect(metadata).toBeDefined();
	});

	it('includes actionCategories from base when available', () => {
		const baseOptions = createBaseOptions();
		const baseRegistries = {
			actions: freezeSerializedRegistry(cloneRegistry(baseOptions.actions)),
			buildings: freezeSerializedRegistry(cloneRegistry(baseOptions.buildings)),
			developments: freezeSerializedRegistry(
				cloneRegistry(baseOptions.developments),
			),
			populations: freezeSerializedRegistry(
				cloneRegistry(baseOptions.populations),
			),
			resources: {} as SerializedRegistry<SessionResourceDefinition>,
			actionCategories: {
				testCategory: { id: 'test', title: 'Test' },
			} as never,
		};
		const context = {
			baseOptions,
			resourceOverrides: undefined,
			baseRegistries,
			baseMetadata: {},
		};
		const config: GameConfig = {};
		const { registries } = buildSessionAssets(context, config);
		expect(registries.actionCategories).toBeDefined();
	});
});
