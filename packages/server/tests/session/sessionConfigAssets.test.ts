import { describe, expect, it } from 'vitest';
import type {
	PhaseConfig,
	RuleSet,
	SessionResourceDefinition,
	SerializedRegistry,
	StartConfig,
	GameConfig,
} from '@kingdom-builder/protocol';
import {
	createContentFactory,
	createResourceV2Registries,
	resourceV2Definition,
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
	const createMinimalStart = (): StartConfig => ({
		player: {
			resources: {},
			stats: {},
			population: {},
			lands: [],
			valuesV2: {},
		},
	});

	it('adds resources from player start config', () => {
		const start: StartConfig = {
			player: {
				resources: { 'resource:test:gold': 10 },
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		expect(registry['resource:test:gold']).toBeDefined();
		expect(registry['resource:test:gold'].key).toBe('resource:test:gold');
	});

	it('adds resources from valuesV2 in player start config', () => {
		const start: StartConfig = {
			player: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				valuesV2: { 'resource:core:happiness': 5 },
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		expect(registry['resource:core:happiness']).toBeDefined();
	});

	it('applies resource overrides when provided', () => {
		const overrides: SerializedRegistry<SessionResourceDefinition> = {
			'resource:custom:test': {
				key: 'resource:custom:test',
				label: 'Custom Resource',
				icon: '🌟',
			},
		};
		const registry = buildResourceRegistry(overrides, createMinimalStart());
		expect(registry['resource:custom:test']).toBeDefined();
		expect(registry['resource:custom:test'].label).toBe('Custom Resource');
	});

	it('handles undefined overrides', () => {
		const registry = buildResourceRegistry(undefined, createMinimalStart());
		expect(registry).toBeDefined();
		expect(typeof registry).toBe('object');
	});

	it('adds resources from per-player start configs', () => {
		const start: StartConfig = {
			player: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
			players: {
				A: {
					resources: { 'resource:test:player-a': 5 },
					stats: {},
					population: {},
					lands: [],
					valuesV2: { 'resource:test:player-a-v2': 10 },
				},
				B: {
					resources: { 'resource:test:player-b': 3 },
					stats: {},
					population: {},
					lands: [],
					valuesV2: {},
				},
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		expect(registry['resource:test:player-a']).toBeDefined();
		expect(registry['resource:test:player-a-v2']).toBeDefined();
		expect(registry['resource:test:player-b']).toBeDefined();
	});

	it('adds resources from mode configs', () => {
		const start: StartConfig = {
			player: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
			modes: {
				easy: {
					player: {
						resources: { 'resource:mode:easy': 100 },
						stats: {},
						population: {},
						lands: [],
						valuesV2: { 'resource:mode:easy-v2': 50 },
					},
				},
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		expect(registry['resource:mode:easy']).toBeDefined();
		expect(registry['resource:mode:easy-v2']).toBeDefined();
	});

	it('adds resources from mode-specific player configs', () => {
		const start: StartConfig = {
			player: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
			modes: {
				custom: {
					player: {
						resources: {},
						stats: {},
						population: {},
						lands: [],
						valuesV2: {},
					},
					players: {
						A: {
							resources: { 'resource:mode:player-a': 20 },
							stats: {},
							population: {},
							lands: [],
							valuesV2: {},
						},
					},
				},
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		expect(registry['resource:mode:player-a']).toBeDefined();
	});

	it('skips undefined mode entries', () => {
		const start: StartConfig = {
			player: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
			modes: {
				valid: {
					player: {
						resources: { 'resource:valid': 1 },
						stats: {},
						population: {},
						lands: [],
						valuesV2: {},
					},
				},
				invalid: undefined as unknown as StartConfig['modes'] extends Record<
					string,
					infer M
				>
					? M
					: never,
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		expect(registry['resource:valid']).toBeDefined();
	});

	it('does not duplicate resources already in registry', () => {
		const overrides: SerializedRegistry<SessionResourceDefinition> = {
			'resource:test:existing': {
				key: 'resource:test:existing',
				label: 'Override Label',
				icon: '🎯',
			},
		};
		const start: StartConfig = {
			player: {
				resources: { 'resource:test:existing': 10 },
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
		};
		const registry = buildResourceRegistry(overrides, start);
		// Override should take precedence
		expect(registry['resource:test:existing'].label).toBe('Override Label');
	});

	it('creates minimal entries for unknown resources', () => {
		const start: StartConfig = {
			player: {
				resources: { 'resource:unknown:test': 5 },
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		// Unknown resources get minimal entries with just the key
		expect(registry['resource:unknown:test']).toBeDefined();
		expect(registry['resource:unknown:test'].key).toBe('resource:unknown:test');
	});

	it('handles empty player config resources', () => {
		const start: StartConfig = {
			player: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		expect(registry).toBeDefined();
	});

	it('handles mode with undefined players', () => {
		const start: StartConfig = {
			player: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				valuesV2: {},
			},
			modes: {
				test: {
					player: {
						resources: { 'resource:mode:test': 1 },
						stats: {},
						population: {},
						lands: [],
						valuesV2: {},
					},
					// players is undefined
				},
			},
		};
		const registry = buildResourceRegistry(undefined, start);
		expect(registry['resource:mode:test']).toBeDefined();
	});
});

describe('buildSessionAssets', () => {
	const createBaseOptions = (): SessionBaseOptions => {
		const factory = createContentFactory();
		const { resources, groups } = createResourceV2Registries({
			resources: [
				resourceV2Definition({
					id: 'resource:test:base',
					metadata: { label: 'Base', icon: '💎' },
				}),
			],
		});
		const phases: PhaseConfig[] = [
			{ id: 'main', action: true, steps: [{ id: 'main' }] },
		];
		const start: StartConfig = {
			player: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				valuesV2: { 'resource:test:base': 10 },
			},
		};
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
			start,
			rules,
			resourceCatalogV2: { resources, groups },
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

	it('applies config overrides when provided', () => {
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
		const config: GameConfig = {
			start: {
				player: {
					resources: {},
					stats: {},
					population: {},
					lands: [],
					valuesV2: { 'resource:test:config': 5 },
				},
			},
		};
		const { registries, metadata } = buildSessionAssets(context, config);
		expect(registries).not.toBe(baseRegistries);
		expect(registries.resources['resource:test:config']).toBeDefined();
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
