import { describe, it, expect, vi } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { registerModifierEvalHandler } from '../src/translation/effects/formatters/modifier';
import { createEngine } from '@kingdom-builder/engine';
import type { EffectDef } from '@kingdom-builder/engine';
import { createContentFactory } from '@kingdom-builder/testing';
import { GENERAL_RESOURCE_ICON, GENERAL_RESOURCE_LABEL } from '../src/icons';
import type { PhaseDef, RuleSet, StartConfig } from '@kingdom-builder/protocol';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createTranslationEnvironmentFromEngine } from './helpers/createTranslationEnvironment';
import { selectResourceDisplay } from '../src/translation/context/assetSelectors';
import type { SessionRegistries } from '../src/state/sessionRegistries';

function createBaseEngineEnvironment(
	configure?: (registries: SessionRegistries) => void,
) {
	const registries = createSessionRegistries();
	configure?.(registries);
	const resourceKeys = Object.keys(registries.resources);
	const tieredResourceKey = resourceKeys[0] ?? 'resource:primary';
	const phases: PhaseDef[] = [
		{ id: 'phase:action', label: 'Action', action: true, steps: [] },
	];
	const start: StartConfig = {
		player: {
			resources: { [tieredResourceKey]: 0 },
			stats: {},
			population: {},
			lands: [],
			buildings: [],
		},
		players: {
			opponent: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				buildings: [],
			},
		},
	};
	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'nearest',
		tieredResourceKey,
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
		winConditions: [],
	};
	const engine = createEngine({
		actions: registries.actions,
		buildings: registries.buildings,
		developments: registries.developments,
		populations: registries.populations,
		phases,
		start,
		rules,
	});
	const { translationContext, metadataSelectors } =
		createTranslationEnvironmentFromEngine(engine, registries);
	engine.assets = translationContext.assets;
	return {
		engine,
		translationContext,
		metadataSelectors,
		tieredResourceKey,
		registries,
	};
}

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createCtx() {
	const { translationContext } = createBaseEngineEnvironment();
	return translationContext;
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
		} as const;
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
		const registries = createSessionRegistries();
		const engine = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases: [],
			start,
			rules,
		});
		const developmentDef = engine.developments.get(development.id);
		if (developmentDef) {
			registries.developments.add(developmentDef.id, { ...developmentDef });
		}
		registries.resources[resourceKey] = {
			key: resourceKey,
			icon: syntheticResource.icon,
			label: syntheticResource.label,
		};
		const { translationContext: ctx } = createTranslationEnvironmentFromEngine(
			engine,
			registries,
		);
		engine.assets = ctx.assets;
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
		const expectedSummary = `${resultIcon}${development.icon ?? development.name}: ${syntheticResource.icon}-2`;
		expect(summary).toEqual([expectedSummary]);
		const resultLabelText = [
			resultDescriptor?.icon ?? '',
			resultDescriptor?.label ?? 'Outcome Adjustment',
		]
			.filter(Boolean)
			.join(' ')
			.trim();
		const developmentLabel = development.icon
			? `${development.icon} ${development.name}`
			: development.name;
		const expectedDescription = `${resultLabelText} on ${developmentLabel}: Whenever it grants ${RESOURCES_KEYWORD}, gain ${syntheticResource.icon}-2 more of that resource`;
		expect(description).toEqual([expectedDescription]);
	});

	it('formats cost modifiers with percent adjustments', () => {
		const { translationContext: ctx, metadataSelectors } =
			createBaseEngineEnvironment();
		const resourceKey = Object.keys(ctx.assets.resources)[0] ?? 'resource:gold';
		const resourceDisplay = selectResourceDisplay(ctx.assets, resourceKey);
		const resourceDescriptor =
			metadataSelectors.resourceMetadata.byId[resourceKey];
		const eff: EffectDef = {
			type: 'cost_mod',
			method: 'add',
			params: {
				id: 'synthetic:discount',
				key: resourceKey,
				actionId: 'build',
				percent: -0.2,
			},
		};
		const summary = summarizeEffects([eff], ctx);
		const goldIcon =
			resourceDescriptor?.icon ?? resourceDisplay.icon ?? resourceKey;
		const costDescriptor = ctx.assets.modifiers.cost;
		const costIcon = costDescriptor?.icon ?? '';
		const costLabelText = [
			costDescriptor?.icon ?? '',
			costDescriptor?.label ?? 'Cost Adjustment',
		]
			.filter(Boolean)
			.join(' ')
			.trim();
		const buildIcon = ctx.actions.get('build')?.icon ?? '🏛️';
		const expectedSummary = `${costIcon}${buildIcon}: ${goldIcon}-20%`;
		expect(summary).toEqual([expectedSummary]);
		const description = describeEffects([eff], ctx);
		const buildLabel = buildIcon ? `${buildIcon} Build` : 'Build';
		const expectedDescription = `${costLabelText} on ${buildLabel}: Decrease cost by 20% ${goldIcon}`;
		expect(description).toEqual([expectedDescription]);
	});

	it('falls back to resource identifiers when metadata is missing', () => {
		const missingKey = 'synthetic:missing-resource';
		const { translationContext: ctx, metadataSelectors } =
			createBaseEngineEnvironment((registries) => {
				registries.resources[missingKey] = { key: missingKey };
			});
		const eff: EffectDef = {
			type: 'cost_mod',
			method: 'add',
			params: {
				id: 'synthetic:missing-metadata',
				key: missingKey,
				actionId: 'build',
				percent: -0.1,
			},
		};
		const summary = summarizeEffects([eff], ctx);
		expect(
			metadataSelectors.resourceMetadata.byId[missingKey]?.icon,
		).toBeUndefined();
		expect(summary[0]).toContain(`${missingKey}-10%`);
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
		const registries = createSessionRegistries();
		const raidDef = engineContext.actions.get(raid.id);
		if (raidDef) {
			registries.actions.add(raidDef.id, { ...raidDef });
		}
		const { translationContext: ctx } = createTranslationEnvironmentFromEngine(
			engineContext,
			registries,
		);
		engineContext.assets = ctx.assets;
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
		expect(summary).toHaveLength(1);
		expect(summary[0]).toContain(`${resultIcon}${targetIcon}: `);
		expect(summary[0]).toContain('+10%');
		const targetLabel = raid.icon ? `${raid.icon} ${raid.name}` : raid.name;
		const resultLabelText = [
			resultDescriptor?.icon ?? '',
			resultDescriptor?.label ?? 'Outcome Adjustment',
		]
			.filter(Boolean)
			.join(' ')
			.trim();
		const summarySuffix = summary[0]?.split(': ')[1] ?? '';
		const transferIcon = summarySuffix.replace('+10%', '');
		expect(description[0]).toBe(
			`${resultLabelText} on ${targetLabel}: Whenever it transfers ${RESOURCES_KEYWORD}, ${transferIcon.trim()} Increase transfer by 10%`,
		);
		const card = description[1];
		expect(card).toMatchObject({
			title: targetLabel,
			_hoist: true,
			_desc: true,
		});
	});
});
