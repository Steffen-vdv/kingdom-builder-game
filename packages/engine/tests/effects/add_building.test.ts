import { describe, it, expect, vi } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { buildingAdd, type EffectDef } from '../../src/effects/index.ts';
import { collectBuildingAddCosts } from '../../src/effects/building_add.ts';
import type { EngineContext } from '../../src/context';
import { resourceAmountParams } from '../helpers/resourceParams.ts';

describe('building:add effect', () => {
	it('adds building and applies its passives', () => {
		// Use isolated mode so actionCostResource returns command-points
		const content = createContentFactory({ isolated: true });
		const target = content.action({
			tiers: {
				'1': {
					costs: { [CResource.gold]: 4 },
					effects: [],
				},
			},
		});
		const building = content.building({
			costs: { [CResource.gold]: 3 },
			onBuild: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'mod',
						actionId: target.id,
						resourceId: CResource.gold,
						amount: 2,
					},
				},
			],
		});
		const grant = content.action({
			tiers: {
				'1': {
					effects: [
						{ type: 'building', method: 'add', params: { id: building.id } },
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const before =
			getActionCosts(target.id, engineContext)[CResource.gold] ?? 0;
		const cost = getActionCosts(grant.id, engineContext, { id: building.id });
		engineContext.activePlayer.resourceValues[CResource.gold] =
			cost[CResource.gold] ?? 0;
		engineContext.activePlayer.resourceValues[CResource.cp] =
			cost[CResource.cp] ?? 0;
		performAction(grant.id, engineContext, { id: building.id });
		const after = getActionCosts(target.id, engineContext)[CResource.gold] ?? 0;
		const bonus = building.onBuild?.find(
			(effect) => effect.type === 'cost_mod' && effect.method === 'add',
		)?.params?.['amount'] as number;
		expect(engineContext.activePlayer.buildings.has(building.id)).toBe(true);
		expect(after).toBe(before + bonus);
	});

	it('throws before paying costs when building already owned', () => {
		// Use isolated mode so actionCostResource returns command-points
		const content = createContentFactory({ isolated: true });
		const building = content.building({ costs: { [CResource.gold]: 2 } });
		const grant = content.action({
			tiers: {
				'1': {
					effects: [
						{ type: 'building', method: 'add', params: { id: building.id } },
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const cost = getActionCosts(grant.id, engineContext, { id: building.id });
		for (const [key, value] of Object.entries(cost)) {
			engineContext.activePlayer.resourceValues[key] = (value ?? 0) * 2;
		}

		performAction(grant.id, engineContext, { id: building.id });

		// Set up resources for second attempt (use CResource.cp for command-points)
		engineContext.activePlayer.resourceValues[CResource.cp] = 5;
		engineContext.activePlayer.resourceValues[CResource.gold] = 10;
		expect(() =>
			performAction(grant.id, engineContext, { id: building.id }),
		).toThrow(`Building ${building.id} already built`);
		// Resources should be unchanged since building ownership check fails first
		expect(engineContext.activePlayer.resourceValues[CResource.cp]).toBe(5);
		expect(engineContext.activePlayer.resourceValues[CResource.gold]).toBe(10);
	});

	it('allows rebuilding after the structure is removed', () => {
		// Use isolated mode so actionCostResource returns command-points
		const content = createContentFactory({ isolated: true });
		const building = content.building();
		const build = content.action({
			tiers: {
				'1': {
					effects: [
						{ type: 'building', method: 'add', params: { id: building.id } },
					],
				},
			},
		});
		const demolish = content.action({
			tiers: {
				'1': {
					effects: [
						{ type: 'building', method: 'remove', params: { id: building.id } },
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const cost = getActionCosts(build.id, engineContext, { id: building.id });
		// Use CResource.cp directly - actions cost command-points via meta-category
		const cpKey = CResource.cp;
		for (const [key, value] of Object.entries(cost)) {
			engineContext.activePlayer.resourceValues[key] = (value ?? 0) * 3;
		}

		performAction(build.id, engineContext, { id: building.id });
		performAction(demolish.id, engineContext, { id: building.id });

		engineContext.activePlayer.resourceValues[cpKey] = 5;
		performAction(build.id, engineContext, { id: building.id });

		expect(engineContext.activePlayer.buildings.has(building.id)).toBe(true);
	});

	it('removes building passives when demolished', () => {
		// Use isolated mode so actionCostResource returns command-points
		const content = createContentFactory({ isolated: true });
		const surcharge = 2;
		const target = content.action({
			tiers: {
				'1': {
					costs: { [CResource.gold]: 3 },
					effects: [],
				},
			},
		});
		const building = content.building({
			onBuild: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'building_surcharge',
						actionId: target.id,
						resourceId: CResource.gold,
						amount: surcharge,
					},
				},
			],
		});
		const build = content.action({
			tiers: {
				'1': {
					effects: [
						{ type: 'building', method: 'add', params: { id: building.id } },
					],
				},
			},
		});
		const demolish = content.action({
			tiers: {
				'1': {
					effects: [
						{ type: 'building', method: 'remove', params: { id: building.id } },
					],
				},
			},
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}

		for (const key of Object.values(CResource)) {
			engineContext.activePlayer.resourceValues[key] = 10;
		}

		const baseCost =
			getActionCosts(target.id, engineContext)[CResource.gold] ?? 0;

		performAction(build.id, engineContext, { id: building.id });
		const afterBuild =
			getActionCosts(target.id, engineContext)[CResource.gold] ?? 0;
		expect(afterBuild - baseCost).toBe(surcharge);

		performAction(demolish.id, engineContext, { id: building.id });
		const afterRemoval =
			getActionCosts(target.id, engineContext)[CResource.gold] ?? 0;
		expect(afterRemoval).toBe(baseCost);
	});

	it('adds passives for new structures', () => {
		// Use isolated mode so actionCostResource returns command-points
		const content = createContentFactory({ isolated: true });
		const building = content.building({
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						resourceId: CResource.gold,
						amount: 1,
					}),
				},
			],
		});
		const addPassive = vi.fn();
		const context = {
			activePlayer: {
				buildings: new Set<string>(),
			},
			buildings: {
				get: vi.fn().mockReturnValue(building),
			},
			passives: {
				addPassive,
			},
		} as unknown as EngineContext;
		const effect: EffectDef = {
			type: 'building',
			method: 'add',
			params: { id: building.id },
		};
		buildingAdd(effect, context, 1);
		expect(context.activePlayer.buildings.has(building.id)).toBe(true);
		expect(addPassive).toHaveBeenCalledTimes(1);
		const [passiveConfig, , meta] = addPassive.mock.calls[0];
		expect(passiveConfig).toEqual({
			id: building.id,
			effects: building.onBuild,
		});
		expect(meta.frames?.()).toEqual({
			kind: 'building',
			id: building.id,
			longevity: 'ongoing',
			dependsOn: [{ type: 'building', id: building.id }],
			removal: { type: 'building', id: building.id, detail: 'removed' },
		});
		// Note: buildingAdd no longer throws on duplicates. Duplicate prevention
		// is now handled by the oneTime action property which sets exhausted=true.
		buildingAdd(effect, context, 1);
		// Second call still adds passive (the Set prevents duplicate building entry)
		expect(addPassive).toHaveBeenCalledTimes(2);
	});

	it('collects building costs when requested and ignores undefined ids', () => {
		// Use isolated mode so actionCostResource returns command-points
		const content = createContentFactory({ isolated: true });
		const building = content.building();
		const base: Record<string, number> = {};
		const context = {
			buildings: {
				get: vi.fn().mockReturnValue(building),
			},
		} as unknown as EngineContext;
		const effectWithId: EffectDef = {
			type: 'building',
			method: 'add',
			params: { id: building.id },
		};
		collectBuildingAddCosts(effectWithId, base, context);
		for (const [key, value] of Object.entries(building.costs)) {
			expect(base[key]).toBe(value ?? 0);
		}
		const emptyBase: Record<string, number> = {};
		const getSpy = vi.fn();
		collectBuildingAddCosts(
			{ type: 'building', method: 'add', params: {} } as EffectDef,
			emptyBase,
			{ buildings: { get: getSpy } } as unknown as EngineContext,
		);
		expect(getSpy).not.toHaveBeenCalled();
		expect(emptyBase).toEqual({});
	});
});
