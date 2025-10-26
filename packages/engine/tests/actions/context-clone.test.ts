import { describe, it, expect, vi } from 'vitest';
import {
	Resource as CResource,
	Stat as CStat,
	PopulationRole as CPopulationRole,
} from '@kingdom-builder/contents';
import { cloneEngineContext } from '../../src/actions/context_clone.ts';
import { createAISystem } from '../../src/ai/index.ts';
import type { StatSourceFrame } from '../../src/stat_sources/index.ts';
import { createTestEngine } from '../helpers.ts';
import { resourceAmountParams } from '../helpers/resourceV2Params.ts';

describe('cloneEngineContext', () => {
	it('clones player state and optional engine context fields', () => {
		const engineContext = createTestEngine();
		const aiSystem = createAISystem({
			performAction: vi.fn(),
			advance: vi.fn(),
		});
		engineContext.aiSystem = aiSystem;
		engineContext.statAddPctBases.example = 3;
		engineContext.statAddPctAccums.example = 4;
		engineContext.recentResourceGains.push({
			key: CResource.gold,
			amount: 2,
		});
		const frame: StatSourceFrame = () => ({
			key: 'frame-meta',
			longevity: 'ongoing',
		});
		engineContext.statSourceStack.push(frame);

		const player = engineContext.activePlayer;
		const goldResourceId = player.getResourceV2Id(CResource.gold);
		player.resources[CResource.gold] = 10;
		player.resourceValues[goldResourceId] = 5;
		player.resourceLowerBounds[goldResourceId] = 0;
		player.resourceUpperBounds[goldResourceId] = 20;
		player.resourceTouched[goldResourceId] = true;
		player.resourceTierIds[goldResourceId] = 'tier-1';
		player.resourceBoundTouched[goldResourceId] = {
			lower: true,
			upper: false,
		};
		const fallbackResource = CResource.happiness;
		const fallbackResourceId = player.getResourceV2Id(fallbackResource);
		player.resources[fallbackResource] = undefined as never;
		player.resourceValues[fallbackResourceId] = undefined as never;
		player.resourceLowerBounds[fallbackResourceId] = undefined as never;
		player.resourceUpperBounds[fallbackResourceId] = undefined as never;
		player.resourceTouched[fallbackResourceId] = undefined as never;
		player.resourceTierIds[fallbackResourceId] = undefined as never;
		player.resourceBoundTouched[fallbackResourceId] = undefined as never;
		player.population[CPopulationRole.Legion] = 2;
		player.population[CPopulationRole.Council] = undefined as never;
		player.stats[CStat.armyStrength] = 3;
		player.statsHistory[CStat.armyStrength] = true;
		const armyStrengthId = player.getStatResourceV2Id(CStat.armyStrength);
		const happinessStatId = player.getStatResourceV2Id(CStat.happiness);

		const land = player.lands[0]!;
		land.upkeep = { [CResource.gold]: 1 };
		land.onPayUpkeepStep = [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: CResource.gold,
					amount: 1,
				}),
			},
		];
		land.onGainIncomeStep = [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: CResource.gold,
					amount: 2,
				}),
			},
		];
		land.onGainAPStep = [
			{
				type: 'resource',
				method: 'add',
				params: resourceAmountParams({
					key: engineContext.actionCostResource,
					amount: 1,
				}),
			},
		];
		land.developments.push('custom-development');

		player.buildings.add('custom-building');
		const actionId = 'custom-action';
		player.actions.add(actionId);
		const statSourceMeta = {
			key: 'meta-id',
			longevity: 'ongoing' as const,
			extra: { note: 'tracked' },
			effect: { type: 'resource', method: 'add' },
		};
		player.statSources[armyStrengthId]['source-id'] = {
			amount: 5,
			meta: statSourceMeta,
		};
		player.statSources[happinessStatId] = undefined as never;

		const phaseId = engineContext.phases[0]!.id;
		const stepId = engineContext.phases[0]!.steps[0]!.id;
		player.skipPhases[phaseId] = { skip: true };
		player.skipSteps[phaseId] = { [stepId]: { blocked: true } };

		player.customData = { nested: { value: 1 } };
		player.customMethod = () => 'ok';
		const weakMap = new WeakMap<object, string>();
		const keyObject = {};
		weakMap.set(keyObject, 'persisted');
		player.nonCloneable = weakMap;

		const cloned = cloneEngineContext(engineContext);

		expect(cloned).not.toBe(engineContext);
		expect(cloned.aiSystem).toBe(aiSystem);
		expect(cloned.actions).toBe(engineContext.actions);
		expect(cloned.game).not.toBe(engineContext.game);
		const clonedPlayer = cloned.game.players[0]!;
		expect(clonedPlayer).not.toBe(player);
		const clonedLand = clonedPlayer.lands[0]!;
		expect(clonedLand).not.toBe(land);
		expect(clonedLand.upkeep).toEqual(land.upkeep);
		expect(clonedLand.onPayUpkeepStep).toEqual(land.onPayUpkeepStep);
		expect(clonedLand.onPayUpkeepStep).not.toBe(land.onPayUpkeepStep);
		expect(clonedLand.onGainIncomeStep).toEqual(land.onGainIncomeStep);
		expect(clonedLand.onGainIncomeStep).not.toBe(land.onGainIncomeStep);
		expect(clonedLand.onGainAPStep).toEqual(land.onGainAPStep);
		expect(clonedLand.onGainAPStep).not.toBe(land.onGainAPStep);
		expect(clonedPlayer.actions.has(actionId)).toBe(true);
		expect(clonedPlayer.buildings.has('custom-building')).toBe(true);
		expect(clonedPlayer.resourceLowerBounds[goldResourceId]).toBe(0);
		expect(clonedPlayer.resourceUpperBounds[goldResourceId]).toBe(20);
		expect(clonedPlayer.resourceTierIds[goldResourceId]).toBe('tier-1');
		expect(clonedPlayer.resourceBoundTouched[goldResourceId]).toEqual({
			lower: true,
			upper: false,
		});
		expect(clonedPlayer.resources[fallbackResource]).toBe(0);
		expect(clonedPlayer.resourceValues[fallbackResourceId]).toBe(0);
		expect(clonedPlayer.resourceLowerBounds[fallbackResourceId]).toBeNull();
		expect(clonedPlayer.resourceUpperBounds[fallbackResourceId]).toBeNull();
		expect(clonedPlayer.resourceTouched[fallbackResourceId]).toBe(false);
		expect(clonedPlayer.resourceTierIds[fallbackResourceId]).toBeNull();
		expect(
			clonedPlayer.resourceBoundTouched[fallbackResourceId],
		).toBeUndefined();
		expect(clonedPlayer.stats[CStat.armyStrength]).toBe(3);
		expect(clonedPlayer.population[CPopulationRole.Legion]).toBe(2);
		expect(clonedPlayer.population[CPopulationRole.Council]).toBe(0);
		expect(clonedPlayer.statSources[armyStrengthId]['source-id']).not.toBe(
			player.statSources[armyStrengthId]['source-id'],
		);
		expect(
			clonedPlayer.statSources[armyStrengthId]['source-id']?.meta,
		).not.toBe(player.statSources[armyStrengthId]['source-id']?.meta);
		expect(clonedPlayer.statSources[happinessStatId]).toEqual({});
		expect(clonedPlayer.skipPhases).not.toBe(player.skipPhases);
		expect(clonedPlayer.skipSteps).not.toBe(player.skipSteps);
		expect(clonedPlayer.customMethod).toBe(player.customMethod);
		expect(clonedPlayer.customData).toEqual(player.customData);
		expect(clonedPlayer.customData).not.toBe(player.customData);
		expect(clonedPlayer.nonCloneable).toBe(player.nonCloneable);
		expect(cloned.statAddPctBases).not.toBe(engineContext.statAddPctBases);
		expect(cloned.statAddPctBases).toEqual(engineContext.statAddPctBases);
		expect(cloned.statAddPctAccums).not.toBe(engineContext.statAddPctAccums);
		expect(cloned.statAddPctAccums).toEqual(engineContext.statAddPctAccums);
		expect(cloned.recentResourceGains).not.toBe(
			engineContext.recentResourceGains,
		);
		expect(cloned.recentResourceGains).toEqual(
			engineContext.recentResourceGains,
		);
		expect(cloned.statSourceStack).not.toBe(engineContext.statSourceStack);
		expect(cloned.statSourceStack[0]).toBe(frame);
	});
});
