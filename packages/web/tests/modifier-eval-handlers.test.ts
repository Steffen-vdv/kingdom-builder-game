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
	RESOURCE_TRANSFER_ICON,
	Resource,
} from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
import { GENERAL_RESOURCE_ICON, GENERAL_RESOURCE_LABEL } from '../src/icons';
import type { PhaseDef, RuleSet, StartConfig } from '@kingdom-builder/protocol';
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createCtx() {
	const engine = createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});
	return createTranslationContextForEngine(engine);
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
		const resourceKey = 'resource:synthetic';
		const syntheticResource = {
			icon: '💠',
			label: 'Synthetic Resource',
		};
		const start: StartConfig = {
			player: {
				resources: { [resourceKey]: 0 },
				stats: {},
				population: {},
				lands: [],
			},
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
		const engine = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases: [],
			start,
			rules,
		});
		const ctx = createTranslationContextForEngine(engine, (registries) => {
			const developmentDef = engine.developments.get(development.id);
			if (developmentDef) {
				registries.developments.add(developmentDef.id, { ...developmentDef });
			}
			registries.resources[resourceKey] = {
				key: resourceKey,
				icon: syntheticResource.icon,
				label: syntheticResource.label,
			};
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
		const resultDescriptor = ctx.assets.modifiers.result;
		const resultIcon = resultDescriptor?.icon ?? '';
		const expectedSummary = `${resultIcon}${development.icon}: ${syntheticResource.icon}-2`;
		expect(summary).toEqual([expectedSummary]);
		const resultLabelText = [
			resultDescriptor?.icon ?? '',
			resultDescriptor?.label ?? 'Outcome Adjustment',
		]
			.filter(Boolean)
			.join(' ')
			.trim();
		const expectedDescription = `${resultLabelText} on ${development.icon} ${development.name}: Whenever it grants ${RESOURCES_KEYWORD}, gain ${syntheticResource.icon}-2 more of that resource`;
		expect(description).toEqual([expectedDescription]);
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
		const goldIcon = ctx.assets.resources[Resource.gold]?.icon ?? Resource.gold;
		const costDescriptor = ctx.assets.modifiers.cost;
		const costIcon = costDescriptor?.icon ?? '';
		const costLabelText = [
			costDescriptor?.icon ?? '',
			costDescriptor?.label ?? 'Cost Adjustment',
		]
			.filter(Boolean)
			.join(' ')
			.trim();
		const expectedSummary = `${costIcon}🏛️: ${goldIcon}-20%`;
		expect(summary).toEqual([expectedSummary]);
		const description = describeEffects([eff], ctx);
		const expectedDescription = `${costLabelText} on 🏛️ Build: Decrease cost by 20% ${goldIcon}`;
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
		const engineContext = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases,
			start,
			rules,
		});
		const ctx = createTranslationContextForEngine(
			engineContext,
			(registries) => {
				const raidDef = engineContext.actions.get(raid.id);
				if (raidDef) {
					registries.actions.add(raidDef.id, { ...raidDef });
				}
			},
		);
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
		const resultDescriptor = ctx.assets.modifiers.result;
		const resultIcon = resultDescriptor?.icon ?? '';
		expect(summary).toEqual([
			`${resultIcon}${targetIcon}: ${RESOURCE_TRANSFER_ICON}+10%`,
		]);
		const targetLabel = raid.icon ? `${raid.icon} ${raid.name}` : raid.name;
		const resultLabelText = [
			resultDescriptor?.icon ?? '',
			resultDescriptor?.label ?? 'Outcome Adjustment',
		]
			.filter(Boolean)
			.join(' ')
			.trim();
		expect(description[0]).toBe(
			`${resultLabelText} on ${targetLabel}: Whenever it transfers ${RESOURCES_KEYWORD}, ${RESOURCE_TRANSFER_ICON} Increase transfer by 10%`,
		);
		const card = description[1];
		expect(card).toMatchObject({
			title: targetLabel,
			_hoist: true,
			_desc: true,
		});
	});
});
