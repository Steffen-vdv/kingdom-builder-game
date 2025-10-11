import { describe, expect, it } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { registerModifierEvalHandler } from '../src/translation/effects/formatters/modifier';
import type {
	ActionConfig,
	DevelopmentConfig,
	EffectDef,
} from '@kingdom-builder/protocol';
import { GENERAL_RESOURCE_ICON, GENERAL_RESOURCE_LABEL } from '../src/icons';
import {
	createTranslationContextStub,
	wrapTranslationRegistry,
	toTranslationPlayer,
} from './helpers/translationContextStub';
import type { TranslationAssets } from '../src/translation/context';

const RESOURCES_KEYWORD = `${GENERAL_RESOURCE_ICON} ${GENERAL_RESOURCE_LABEL}`;

const BASE_ASSETS: TranslationAssets = {
	resources: {
		gold: { icon: '🪙', label: 'Gold' },
		'resource:synthetic': { icon: '💠', label: 'Synthetic Resource' },
	},
	stats: {},
	populations: {},
	population: { icon: '👥', label: 'Population' },
	land: { icon: '🗺️', label: 'Land' },
	slot: { icon: '🧩', label: 'Development Slot' },
	passive: { icon: '♾️', label: 'Passive' },
	modifiers: {
		cost: { icon: '💲', label: 'Cost Adjustment' },
		result: { icon: '✨', label: 'Outcome Adjustment' },
	},
	resourceTransferIcon: '🔁',
	formatPassiveRemoval: (description: string) =>
		`Active as long as ${description}`,
};

const BASE_ACTIONS: Record<string, ActionConfig> = {
	build: { id: 'build', name: 'Build', icon: '🏛️', baseCosts: {}, effects: [] },
	raid: { id: 'raid', name: 'Raid', icon: '⚔️', baseCosts: {}, effects: [] },
};

const BASE_DEVELOPMENTS: Record<string, DevelopmentConfig> = {
	'development:synthetic': {
		id: 'development:synthetic',
		name: 'Synthetic Development',
		icon: '🧬',
		cost: [],
		effects: [],
	},
};

const EMPTY_REGISTRY = wrapTranslationRegistry({
	get() {
		return {};
	},
	has() {
		return false;
	},
});

const toRegistry = <T>(entries: Record<string, T>) =>
	wrapTranslationRegistry({
		get(id: string) {
			const entry = entries[id];
			if (!entry) {
				throw new Error(`Missing registry entry: ${id}`);
			}
			return entry;
		},
		has(id: string) {
			return Object.prototype.hasOwnProperty.call(entries, id);
		},
	});

function createTestContext(
	options: {
		assets?: TranslationAssets;
		actions?: Record<string, ActionConfig>;
		developments?: Record<string, DevelopmentConfig>;
	} = {},
) {
	const actions = toRegistry(options.actions ?? BASE_ACTIONS);
	const developments = toRegistry(options.developments ?? BASE_DEVELOPMENTS);
	const players = {
		active: toTranslationPlayer({
			id: 'A' as never,
			name: 'Player A',
			resources: {},
			population: {},
			stats: {},
		}),
		opponent: toTranslationPlayer({
			id: 'B' as never,
			name: 'Player B',
			resources: {},
			population: {},
			stats: {},
		}),
	};
	return createTranslationContextStub({
		phases: [],
		actionCostResource: 'gold',
		actions,
		buildings: EMPTY_REGISTRY,
		developments,
		populations: EMPTY_REGISTRY,
		activePlayer: players.active,
		opponent: players.opponent,
		assets: options.assets ?? BASE_ASSETS,
	});
}

describe('modifier evaluation handlers', () => {
	it('allows registering custom evaluation formatters', () => {
		const ctx = createTestContext();
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
		const ctx = createTestContext();
		const syntheticResource = ctx.assets.resources['resource:synthetic'];
		const development = BASE_DEVELOPMENTS['development:synthetic'];
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				evaluation: {
					type: 'development',
					id: 'development:synthetic',
				},
			},
			effects: [
				{
					type: 'resource',
					method: 'remove',
					params: { key: 'resource:synthetic', amount: 2 },
				},
			],
		};
		const summary = summarizeEffects([eff], ctx);
		const description = describeEffects([eff], ctx);
		const resultIcon = ctx.assets.modifiers.result?.icon ?? '';
		const expectedSummary = `${resultIcon}${development.icon}: ${
			syntheticResource?.icon ?? 'resource:synthetic'
		}-2`;
		expect(summary).toEqual([expectedSummary]);
		const resultLabel =
			ctx.assets.modifiers.result?.label ?? 'Outcome Adjustment';
		const resultLabelText =
			`${resultIcon ? `${resultIcon} ` : ''}${resultLabel}`.trim();
		const developmentLabel = `${development.icon} ${development.name}`;
		const expectedDescription =
			`${resultLabelText} on ${developmentLabel}: Whenever it grants ${RESOURCES_KEYWORD}, ` +
			`gain ${syntheticResource?.icon ?? ''}-2 more of that resource`.replace(
				'  ',
				' ',
			);
		expect(description).toEqual([expectedDescription.trim()]);
	});

	it('formats cost modifiers with percent adjustments', () => {
		const ctx = createTestContext();
		const eff: EffectDef = {
			type: 'cost_mod',
			method: 'add',
			params: {
				id: 'synthetic:discount',
				key: 'gold',
				actionId: 'build',
				percent: -0.2,
			},
		};
		const summary = summarizeEffects([eff], ctx);
		const description = describeEffects([eff], ctx);
		const costIcon =
			ctx.assets.modifiers.cost?.icon ?? ctx.assets.modifiers.cost?.label ?? '';
		const buildAction = BASE_ACTIONS['build'];
		const goldIcon = ctx.assets.resources.gold?.icon ?? 'gold';
		const expectedSummary = `${costIcon}${buildAction.icon}: ${goldIcon}-20%`;
		expect(summary).toEqual([expectedSummary]);
		const costLabel = ctx.assets.modifiers.cost?.label ?? 'Cost Adjustment';
		const costLabelText =
			`${ctx.assets.modifiers.cost?.icon ? `${ctx.assets.modifiers.cost?.icon} ` : ''}${costLabel}`.trim();
		const expectedDescription =
			`${costLabelText} on ${buildAction.icon} ${buildAction.name}: ` +
			`Decrease cost by 20% ${goldIcon}`;
		expect(description).toEqual([expectedDescription]);
	});

	it('formats transfer percent evaluation modifiers with modifier fallbacks', () => {
		const assets: TranslationAssets = {
			...BASE_ASSETS,
			modifiers: {
				...BASE_ASSETS.modifiers,
				result: { label: BASE_ASSETS.modifiers.result?.label },
			},
		};
		const ctx = createTestContext({ assets });
		const eff: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:transfer-bonus',
				evaluation: { type: 'transfer_pct', id: 'raid' },
				adjust: 10,
			},
		};

		const summary = summarizeEffects([eff], ctx);
		const description = describeEffects([eff], ctx);
		const resultLabel = assets.modifiers.result?.label ?? 'Outcome Adjustment';
		const raidAction = BASE_ACTIONS['raid'];
		const transferIcon = assets.resourceTransferIcon ?? '🔁';
		expect(summary).toEqual([
			`${resultLabel} ${raidAction.icon}: ${transferIcon}+10%`,
		]);
		const modifierDescription = `${resultLabel} on ${raidAction.icon} ${raidAction.name}: Whenever it transfers ${RESOURCES_KEYWORD}, ${transferIcon} Increase transfer by 10%`;
		const card = description[1];
		expect(description[0]).toBe(modifierDescription);
		expect(card).toMatchObject({
			title: `${raidAction.icon} ${raidAction.name}`,
			_hoist: true,
			_desc: true,
		});
	});
});
