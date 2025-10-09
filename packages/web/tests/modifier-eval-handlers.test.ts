import { describe, it, expect, vi } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { registerModifierEvalHandler } from '../src/translation/effects/formatters/modifier';
import { createEngine } from '@kingdom-builder/engine';
import type { EffectDef } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	MODIFIER_INFO,
	RESOURCES,
	type ResourceKey,
	RESOURCE_TRANSFER_ICON,
	Resource,
} from '@kingdom-builder/contents';
import { createContentFactory } from '../../engine/tests/factories/content';
import { GENERAL_RESOURCE_ICON, GENERAL_RESOURCE_LABEL } from '../src/icons';
import type { PhaseDef, RuleSet, StartConfig } from '@kingdom-builder/protocol';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createCtx() {
	return createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});
}

const RESOURCES_KEYWORD = `${GENERAL_RESOURCE_ICON} ${GENERAL_RESOURCE_LABEL}`;

describe('modifier evaluation handlers', () => {
	it('allows registering custom evaluation formatters', () => {
		const ctx = createCtx();
		registerModifierEvalHandler('test_eval', {
			summarize: () => ['handled'],
			describe: () => ['handled desc'],
		});
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: { evaluation: { type: 'test_eval', id: 'x' } },
		};
		const summary = summarizeEffects([eff], ctx);
		const description = describeEffects([eff], ctx);
		expect(summary).toContain('handled');
		expect(description).toContain('handled desc');
	});

	it('formats development result modifiers with resource removal', () => {
		const content = createContentFactory();
		const development = content.development({
			id: 'development:synthetic',
			name: 'Synthetic Development',
			icon: '🧬',
		});
		const resourceKey = 'resource:synthetic' as unknown as ResourceKey;
		const syntheticResource = {
			key: resourceKey,
			icon: '💠',
			label: 'Synthetic Resource',
			description: 'A synthetic resource for formatting assertions.',
		};
		const resources = RESOURCES as unknown as Record<
			string,
			typeof syntheticResource | undefined
		>;
		const previousResource = resources[resourceKey];
		resources[resourceKey] = syntheticResource;

		const playerStart = {
			resources: {} as Record<ResourceKey, number>,
			stats: {},
			population: {},
			lands: [],
		};
		playerStart.resources[resourceKey] = 0;

		const start: StartConfig = {
			player: playerStart,
		};
		const rules: RuleSet = {
			defaultActionAPCost: 1,
			absorptionCapPct: 1,
			absorptionRounding: 'down',
			tieredResourceKey: resourceKey,
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 1,
			winConditions: [],
		};
		try {
			const ctx = createEngine({
				actions: content.actions,
				buildings: content.buildings,
				developments: content.developments,
				populations: content.populations,
				phases: [],
				start,
				rules,
			});
			const eff: EffectDef = {
				type: 'result_mod',
				method: 'add',
				params: {
					evaluation: { type: 'development', id: development.id },
				},
				effects: [
					{
						type: 'resource',
						method: 'remove',
						params: { key: resourceKey, amount: 2 },
					},
				],
			};
			const summary = summarizeEffects([eff], ctx);
			const description = describeEffects([eff], ctx);
			const expectedSummary = `${MODIFIER_INFO.result.icon}${development.icon}: ${syntheticResource.icon}-2`;
			expect(summary).toEqual([expectedSummary]);
			const expectedDescription = `${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${development.icon} ${development.name}: Whenever it grants ${RESOURCES_KEYWORD}, gain ${syntheticResource.icon}-2 more of that resource`;
			expect(description).toEqual([expectedDescription]);
		} finally {
			if (previousResource) {
				resources[resourceKey] = previousResource;
			} else {
				delete resources[resourceKey];
			}
		}
	});

	it('formats cost modifiers with percent adjustments', () => {
		const ctx = createCtx();
		const eff: EffectDef = {
			type: 'cost_mod',
			method: 'add',
			params: {
				id: 'synthetic:discount',
				key: Resource.gold,
				actionId: 'build',
				percent: -0.2,
			},
		};
		const summary = summarizeEffects([eff], ctx);
		const goldIcon = RESOURCES[Resource.gold].icon;
		const expectedSummary = `${MODIFIER_INFO.cost.icon}🏛️: ${goldIcon}-20%`;
		expect(summary).toEqual([expectedSummary]);
		const description = describeEffects([eff], ctx);
		const expectedDescription =
			`${MODIFIER_INFO.cost.icon} ${MODIFIER_INFO.cost.label}` +
			` on 🏛️ Build: Decrease cost by 20% ${goldIcon}`;
		expect(description).toEqual([expectedDescription]);
	});

	it('formats transfer percent evaluation modifiers for arbitrary actions', () => {
		const content = createContentFactory();
		const raid = content.action({ id: 'raid', name: 'Raid', icon: '⚔️' });
		const tierResourceKey = 'synthetic:resource:tier';
		const phases: PhaseDef[] = [
			{
				id: 'phase:synthetic',
				label: 'Synthetic',
				icon: '🧪',
				steps: [{ id: 'phase:synthetic:step' }],
			},
		];
		const start: StartConfig = {
			player: {
				resources: { [tierResourceKey]: 0 },
				stats: {},
				population: {},
				lands: [],
			},
		};
		const rules: RuleSet = {
			defaultActionAPCost: 1,
			absorptionCapPct: 1,
			absorptionRounding: 'down',
			tieredResourceKey: tierResourceKey,
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 1,
			winConditions: [],
		};
		const ctx = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases,
			start,
			rules,
		});
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:transfer-bonus',
				evaluation: { type: 'transfer_pct', id: raid.id },
				adjust: 10,
			},
		};

		const summary = summarizeEffects([eff], ctx);
		const description = describeEffects([eff], ctx);
		const targetIcon = raid.icon?.trim() ? raid.icon : raid.name;
		expect(summary).toEqual([
			`${MODIFIER_INFO.result.icon}${targetIcon}: ${RESOURCE_TRANSFER_ICON}+10%`,
		]);
		const targetLabel = raid.icon ? `${raid.icon} ${raid.name}` : raid.name;
		expect(description[0]).toBe(
			`${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${targetLabel}: Whenever it transfers ${RESOURCES_KEYWORD}, ${RESOURCE_TRANSFER_ICON} Increase transfer by 10%`,
		);
		const card = description[1];
		expect(card).toMatchObject({
			title: targetLabel,
			_hoist: true,
			_desc: true,
		});
	});
});
