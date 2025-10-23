import { beforeAll, describe, expect, it } from 'vitest';
import { registerCoreEffects } from '../../src/effects';
import { ResourceV2TierService } from '../../src/resourceV2/tier_service';
import { ResourceV2Service } from '../../src/resourceV2/service';
import { loadResourceV2Registry } from '../../src/resourceV2/registry';
import { GameState, initializePlayerResourceV2State } from '../../src/state';
import { EngineContext } from '../../src/context';
import { Services, PassiveManager } from '../../src/services';
import type { RuleSet } from '../../src/services';
import {
	createContentFactory,
	createResourceV2Definition,
} from '@kingdom-builder/testing';
import type {
	EffectDef,
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';

describe('ResourceV2TierService', () => {
	beforeAll(() => {
		registerCoreEffects();
	});

	const calmPassiveId = 'calm';
	const radiantPassiveId = 'radiant';

	function createTierTrack(): ResourceV2TierTrackDefinition {
		const toPassiveAdd = (id: string): EffectDef => ({
			type: 'passive',
			method: 'add',
			params: { id },
		});
		const toPassiveRemove = (id: string): EffectDef => ({
			type: 'passive',
			method: 'remove',
			params: { id },
		});
		const addStat: EffectDef = {
			type: 'stat',
			method: 'add',
			params: { key: 'tierStat', amount: 1 },
		};
		const addRadiantStat: EffectDef = {
			type: 'stat',
			method: 'add',
			params: { key: 'tierStat', amount: 5 },
		};
		const calm: ResourceV2TierDefinition = {
			id: 'calm',
			range: { min: 0, max: 5 },
			enterEffects: [toPassiveAdd(calmPassiveId), addStat],
			exitEffects: [toPassiveRemove(calmPassiveId)],
			display: {
				summary: 'Calm Tier',
				removalCondition: 'Lose Calm',
			},
		};
		const radiant: ResourceV2TierDefinition = {
			id: 'radiant',
			range: { min: 5 },
			enterEffects: [toPassiveAdd(radiantPassiveId), addRadiantStat],
			exitEffects: [toPassiveRemove(radiantPassiveId)],
			display: {
				summary: 'Radiant Tier',
				removalCondition: 'Lose Radiance',
			},
		};
		return {
			id: 'serenity-track',
			tiers: [calm, radiant],
		} satisfies ResourceV2TierTrackDefinition;
	}

	function createRules(): RuleSet {
		return {
			defaultActionAPCost: 1,
			absorptionCapPct: 0,
			absorptionRounding: 'down',
			tieredResourceKey: 'legacy-tier',
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 1,
			winConditions: [],
		};
	}

	function setupContext() {
		const content = createContentFactory();
		const tierTrack = createTierTrack();
		const definition = createResourceV2Definition({
			id: 'serenity',
			name: 'Serenity',
			tierTrack,
		});
		const registry = loadResourceV2Registry({
			resources: [definition],
		});
		const services = new Services(createRules(), content.developments);
		const tierService = new ResourceV2TierService(registry);
		services.setResourceV2TierService(tierService);
		const resourceService = new ResourceV2Service(registry, tierService);
		const passives = new PassiveManager();
		const game = new GameState('Player', 'Opponent');
		const context = new EngineContext(
			game,
			services,
			resourceService,
			content.actions,
			content.buildings,
			content.developments,
			content.populations,
			passives,
			[],
			'action-cost',
			{ A: {}, B: {} },
		);
		const player = context.activePlayer;
		const opponent = context.opponent;
		initializePlayerResourceV2State(player, registry);
		initializePlayerResourceV2State(opponent, registry);
		player.stats['tierStat'] = 0;
		opponent.stats['tierStat'] = 0;
		player.statsHistory['tierStat'] = false;
		opponent.statsHistory['tierStat'] = false;
		services.initializeResourceV2TierPassives(context);
		return {
			context,
			player,
			opponent,
			resourceService,
			tierService,
			registry,
			resourceId: definition.id,
		};
	}

	it('removes previous tier passives and applies enter effects for the next tier', () => {
		const { context, player, resourceService, resourceId } = setupContext();
		const calmRecord = context.passives.get(calmPassiveId, player.id);
		expect(calmRecord).toBeDefined();
		expect(calmRecord?.detail).toBe('Calm Tier');
		expect(calmRecord?.meta?.source).toMatchObject({
			type: 'resource-v2-tier',
			id: 'calm',
			resourceId,
			label: 'Calm Tier',
		});
		expect(calmRecord?.meta?.removal).toMatchObject({ text: 'Lose Calm' });
		expect(player.stats['tierStat']).toBe(1);

		resourceService.applyValueChange(context, player, resourceId, {
			delta: 5,
			reconciliation: 'clamp',
		});

		const calmAfterGain = context.passives.get(calmPassiveId, player.id);
		expect(calmAfterGain).toBeUndefined();
		const radiantRecord = context.passives.get(radiantPassiveId, player.id);
		expect(radiantRecord).toBeDefined();
		expect(radiantRecord?.detail).toBe('Radiant Tier');
		expect(radiantRecord?.meta?.source).toMatchObject({
			type: 'resource-v2-tier',
			id: 'radiant',
			resourceId,
			label: 'Radiant Tier',
		});
		expect(radiantRecord?.meta?.removal).toMatchObject({
			text: 'Lose Radiance',
		});
		expect(player.stats['tierStat']).toBe(6);

		resourceService.applyValueChange(context, player, resourceId, {
			delta: -5,
			reconciliation: 'clamp',
		});

		const calmAfterDrop = context.passives.get(calmPassiveId, player.id);
		expect(calmAfterDrop).toBeDefined();
		expect(context.passives.get(radiantPassiveId, player.id)).toBeUndefined();
		expect(player.stats['tierStat']).toBe(7);
	});

	it('skips redundant tier transitions when the value stays within the same range', () => {
		const { context, player, resourceService, resourceId } = setupContext();
		expect(player.stats['tierStat']).toBe(1);

		resourceService.applyValueChange(context, player, resourceId, {
			delta: 2,
			reconciliation: 'clamp',
		});

		expect(player.stats['tierStat']).toBe(1);
		const calmRecord = context.passives.get(calmPassiveId, player.id);
		expect(calmRecord).toBeDefined();
		expect(calmRecord?.detail).toBe('Calm Tier');
	});
});
