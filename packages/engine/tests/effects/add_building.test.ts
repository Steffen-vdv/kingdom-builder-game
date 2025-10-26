import { describe, it, expect, vi } from 'vitest';
import { performAction, getActionCosts, advance } from '../../src';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { buildingAdd, type EffectDef } from '../../src/effects/index.ts';
import { collectBuildingAddCosts } from '../../src/effects/building_add.ts';
import type { EngineContext } from '../../src/context';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

describe('building:add effect', () => {
	it('adds building and applies its passives', () => {
		const content = createContentFactory();
		const target = content.action({ baseCosts: { [CResource.gold]: 4 } });
		const building = content.building({
			costs: { [CResource.gold]: 3 },
			onBuild: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'mod',
						actionId: target.id,
						key: CResource.gold,
						amount: 2,
					},
				},
			],
		});
		const grant = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const before =
			getActionCosts(target.id, engineContext)[CResource.gold] ?? 0;
		const cost = getActionCosts(grant.id, engineContext, { id: building.id });
		engineContext.activePlayer.gold = cost[CResource.gold] ?? 0;
		engineContext.activePlayer.ap = cost[CResource.ap] ?? 0;
		performAction(grant.id, engineContext, { id: building.id });
		const after = getActionCosts(target.id, engineContext)[CResource.gold] ?? 0;
		const bonus = building.onBuild?.find(
			(effect) => effect.type === 'cost_mod' && effect.method === 'add',
		)?.params?.['amount'] as number;
		expect(engineContext.activePlayer.buildings.has(building.id)).toBe(true);
		expect(after).toBe(before + bonus);
	});

	it('throws before paying costs when building already owned', () => {
		const content = createContentFactory();
		const building = content.building({ costs: { [CResource.gold]: 2 } });
		const grant = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const cost = getActionCosts(grant.id, engineContext, { id: building.id });
		for (const [key, value] of Object.entries(cost)) {
			engineContext.activePlayer.resources[key] = (value ?? 0) * 2;
		}

		performAction(grant.id, engineContext, { id: building.id });

		const actionKey = engineContext.actionCostResource as string;
		engineContext.activePlayer.resources[actionKey] = 5;
		engineContext.activePlayer.resources[CResource.gold] = 10;
		expect(() =>
			performAction(grant.id, engineContext, { id: building.id }),
		).toThrow(`Building ${building.id} already built`);
		expect(engineContext.activePlayer.resources[actionKey]).toBe(5);
		expect(engineContext.activePlayer.resources[CResource.gold]).toBe(10);
	});

	it('allows rebuilding after the structure is removed', () => {
		const content = createContentFactory();
		const building = content.building();
		const build = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const demolish = content.action({
			effects: [
				{ type: 'building', method: 'remove', params: { id: building.id } },
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		const cost = getActionCosts(build.id, engineContext, { id: building.id });
		const actionKey = engineContext.actionCostResource as string;
		for (const [key, value] of Object.entries(cost)) {
			engineContext.activePlayer.resources[key] = (value ?? 0) * 3;
		}

		performAction(build.id, engineContext, { id: building.id });
		performAction(demolish.id, engineContext, { id: building.id });

		engineContext.activePlayer.resources[actionKey] = 5;
		performAction(build.id, engineContext, { id: building.id });

		expect(engineContext.activePlayer.buildings.has(building.id)).toBe(true);
	});

	it('removes building passives when demolished', () => {
		const content = createContentFactory();
		const surcharge = 2;
		const target = content.action({
			baseCosts: { [CResource.gold]: 3 },
		});
		const building = content.building({
			onBuild: [
				{
					type: 'cost_mod',
					method: 'add',
					params: {
						id: 'building_surcharge',
						actionId: target.id,
						key: CResource.gold,
						amount: surcharge,
					},
				},
			],
		});
		const build = content.action({
			effects: [
				{ type: 'building', method: 'add', params: { id: building.id } },
			],
		});
		const demolish = content.action({
			effects: [
				{ type: 'building', method: 'remove', params: { id: building.id } },
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}

		for (const key of Object.keys(engineContext.activePlayer.resources)) {
			engineContext.activePlayer.resources[key] = 10;
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

	it('adds passives for new structures and reports duplicate installations', () => {
		const content = createContentFactory();
		const building = content.building({
			onBuild: [
				{
					type: 'resource',
					method: 'add',
					params: resourceAmountParams({
						key: CResource.gold,
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
		expect(() => buildingAdd(effect, context, 1)).toThrow(
			`Building ${building.id} already built`,
		);
		expect(addPassive).toHaveBeenCalledTimes(1);
	});

	it('collects building costs when requested and ignores undefined ids', () => {
		const content = createContentFactory();
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
