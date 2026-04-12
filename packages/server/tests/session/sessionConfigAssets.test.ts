import { describe, expect, it } from 'vitest';
import type { PhaseConfig, RuleSet, GameConfig } from '@boardsmith/protocol';
import {
	createContentFactory,
	createResourceRegistries,
	resourceDefinition,
} from '@boardsmith/testing';
import {
	buildSessionAssets,
	type SessionBaseOptions,
} from '../../src/session/sessionConfigAssets.js';

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
			actionMetaCategories: factory.actionMetaCategories,
			buildings: factory.buildings,
			developments: factory.developments,
			phases,
			rules,
			resourceCatalog: { resources, groups },
		};
	};

	it('builds registries from baseOptions when config is undefined', () => {
		const baseOptions = createBaseOptions();
		const context = { baseOptions };
		const { registries, metadata } = buildSessionAssets(context, undefined);
		expect(registries).toBeDefined();
		expect(registries.resources).toBeDefined();
		expect(metadata).toBeDefined();
		// Registries must contain the content from baseOptions
		for (const [id] of baseOptions.developments.entries()) {
			expect(registries.developments[id]).toBeDefined();
		}
		for (const [id] of baseOptions.actions.entries()) {
			expect(registries.actions[id]).toBeDefined();
		}
		for (const [id] of baseOptions.buildings.entries()) {
			expect(registries.buildings[id]).toBeDefined();
		}
	});

	it('preserves content-specific IDs in registries', () => {
		const factory = createContentFactory({ isolated: true });
		factory.development({
			id: 'dev:bse:farm',
			name: 'Farm',
			icon: '🌾',
		});
		factory.action({
			id: 'action:bse:harvest',
			name: 'Harvest',
		});
		const { resources, groups } = createResourceRegistries({
			resources: [
				resourceDefinition({
					id: 'resource:bse:gold',
					metadata: { label: 'Gold', icon: '🪙' },
				}),
			],
		});
		const baseOptions: SessionBaseOptions = {
			actions: factory.actions,
			actionCategories: factory.categories,
			actionMetaCategories: factory.actionMetaCategories,
			buildings: factory.buildings,
			developments: factory.developments,
			phases: [{ id: 'main', action: true, steps: [{ id: 'main' }] }],
			rules: {
				defaultActionAPCost: 1,
				absorptionCapPct: 1,
				absorptionRounding: 'down',
				tieredResourceKey: 'resource:bse:gold',
				tierDefinitions: [],
				slotsPerNewLand: 1,
				maxSlotsPerLand: 2,
				basePopulationCap: 1,
				winConditions: [],
			},
			resourceCatalog: { resources, groups },
		};
		const { registries } = buildSessionAssets({ baseOptions }, undefined);
		expect(registries.developments['dev:bse:farm']).toBeDefined();
		expect(registries.developments['dev:bse:farm'].name).toBe('Farm');
		expect(registries.actions['action:bse:harvest']).toBeDefined();
		expect(registries.actions['action:bse:harvest'].name).toBe('Harvest');
	});

	it('creates new registries when config is provided', () => {
		const baseOptions = createBaseOptions();
		const context = { baseOptions };
		// Any non-empty GameConfig triggers config validation path
		const config: GameConfig = {};
		const { registries, metadata } = buildSessionAssets(context, config);
		expect(registries).toBeDefined();
		expect(registries.resources).toBeDefined();
		expect(metadata).toBeDefined();
	});

	it('includes actionCategories from baseOptions', () => {
		const baseOptions = createBaseOptions();
		const context = { baseOptions };
		const config: GameConfig = {};
		const { registries } = buildSessionAssets(context, config);
		expect(registries.actionCategories).toBeDefined();
	});

	it('includes actionCategories when config is undefined', () => {
		const baseOptions = createBaseOptions();
		const context = { baseOptions };
		const { registries } = buildSessionAssets(context, undefined);
		expect(registries.actionCategories).toBeDefined();
	});
});
