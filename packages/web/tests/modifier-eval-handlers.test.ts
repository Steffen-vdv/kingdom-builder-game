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
	RESOURCE_TRANSFER_ICON,
	Resource,
} from '@kingdom-builder/contents';
import { createContentFactory } from '../../engine/tests/factories/content';

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
		const ctx = createCtx();
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				evaluation: { type: 'development', id: 'farm' },
			},
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: { key: Resource.happiness, amount: 2 },
				},
			],
		};
		const summary = summarizeEffects([eff], ctx);
		const description = describeEffects([eff], ctx);
		const farm = ctx.developments.get('farm');
		const happiness = RESOURCES[Resource.happiness];
		expect(summary).toEqual([
			`${MODIFIER_INFO.result.icon}${farm.icon}: ${happiness.icon}-2`,
		]);
		expect(description).toEqual([
			`${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${farm.icon} ${farm.name}: Whenever it grants resources, gain ${happiness.icon}-2 more of that resource`,
		]);
	});

	it('formats transfer percentage modifiers targeting non-plunder actions', () => {
		const ctx = createCtx();
		const content = createContentFactory();
		const raid = content.action({
			id: 'raid',
			name: 'Raid',
			icon: '🏴',
			effects: [],
		});
		ctx.actions.add(raid.id, raid);

		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				actionId: raid.id,
				evaluation: { type: 'transfer_pct', id: raid.id },
				adjust: 12,
			},
		};

		const summary = summarizeEffects([eff], ctx);
		expect(summary).toEqual([
			`${MODIFIER_INFO.result.icon}${raid.icon}: ${RESOURCE_TRANSFER_ICON}+12%`,
		]);

		const description = describeEffects([eff], ctx);
		expect(description[0]).toBe(
			`${MODIFIER_INFO.result.icon} ${MODIFIER_INFO.result.label} on ${raid.icon} ${raid.name}: Whenever it transfers resources, ${RESOURCE_TRANSFER_ICON} Increase transfer by 12%`,
		);
		const card = description[1] as { title: string; items?: unknown[] };
		expect(card.title).toBe(`${raid.icon} ${raid.name}`);
	});
});
