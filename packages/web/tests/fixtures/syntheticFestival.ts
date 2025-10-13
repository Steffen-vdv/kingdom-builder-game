import {
	createEngine,
	type EffectDef,
	type RuleSet,
} from '../../../engine/src';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTranslationContextForEngine } from '../helpers/createTranslationContextForEngine';
import type { TranslationContext } from '../../src/translation/context/types';

const ON_UPKEEP_PHASE = 'onUpkeepPhase';

const SYNTHETIC_RESOURCES = Object.freeze({
	actionPoints: Object.freeze({
		id: 'resource:synthetic:ap',
		icon: '🛠️',
		label: 'Synthetic Action Points',
	}),
	happiness: Object.freeze({
		id: 'resource:synthetic:happiness',
		icon: '🎊',
		label: 'Synthetic Happiness',
	}),
});

const SYNTHETIC_RESULT_MODIFIER = Object.freeze({
	icon: '✨',
	label: 'Outcome Adjustment',
});

const FALLBACK_UPKEEP = Object.freeze({
	icon: '🧹',
	label: 'Upkeep',
});

type SyntheticResourceId =
	(typeof SYNTHETIC_RESOURCES)[keyof typeof SYNTHETIC_RESOURCES]['id'];

const toResourceLookup = () => {
	const entries: Record<string, { icon: string; label: string }> = {};
	for (const resource of Object.values(SYNTHETIC_RESOURCES)) {
		entries[resource.id] = { icon: resource.icon, label: resource.label };
	}
	return Object.freeze(entries);
};

const RESOURCE_LOOKUP = toResourceLookup();

const FORTIFICATION_STAT_KEY = 'fortificationStrength';

export interface SyntheticFestivalScenario {
	ctx: ReturnType<typeof createEngine>;
	translation: TranslationContext;
	festivalActionId: string;
	attackActionId: string;
	resources: Readonly<
		Record<SyntheticResourceId, { icon: string; label: string }>
	>;
}

export const createSyntheticFestivalScenario =
	(): SyntheticFestivalScenario => {
		const factory = createContentFactory();
		const attackAction = factory.action({
			name: 'Synthetic Raid',
			icon: '⚔️',
			baseCosts: { [SYNTHETIC_RESOURCES.actionPoints.id]: 1 },
		});
		const passiveId = 'passive:synthetic:festival-hangover';
		const resultModId = 'result:synthetic:festival-penalty';
		const festivalAction = factory.action({
			name: 'Synthetic Festival',
			icon: '🎊',
			baseCosts: { [SYNTHETIC_RESOURCES.actionPoints.id]: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						key: SYNTHETIC_RESOURCES.happiness.id,
						amount: 4,
					},
				},
				{
					type: 'stat',
					method: 'remove',
					params: {
						key: FORTIFICATION_STAT_KEY,
						amount: 2,
					},
				},
				{
					type: 'passive',
					method: 'add',
					params: {
						id: passiveId,
						name: 'Festival Hangover',
						icon: '🤮',
						onUpkeepPhase: [
							{
								type: 'passive',
								method: 'remove',
								params: { id: passiveId },
							},
						],
					},
					effects: [
						{
							type: 'result_mod',
							method: 'add',
							params: {
								id: resultModId,
								actionId: attackAction.id,
							},
							effects: [
								{
									type: 'resource',
									method: 'remove',
									params: {
										key: SYNTHETIC_RESOURCES.happiness.id,
										amount: 2,
									},
									meta: { allowShortfall: true },
								},
							],
						},
					],
				},
			],
		});

		const phases = [
			{
				id: 'phase:synthetic:main',
				label: 'Celebration',
				icon: '🎪',
				action: true,
				steps: [
					{
						id: 'step:synthetic:main:start',
						title: 'Begin Festivities',
					},
				],
			},
			{
				id: 'phase:synthetic:rest',
				label: 'Well-Earned Rest',
				icon: '🛌',
				steps: [
					{
						id: 'step:synthetic:rest',
						title: 'Recover',
						triggers: [ON_UPKEEP_PHASE],
					},
				],
			},
		];

		const start = {
			player: {
				resources: {
					[SYNTHETIC_RESOURCES.actionPoints.id]: 3,
					[SYNTHETIC_RESOURCES.happiness.id]: 0,
				},
				stats: {
					[FORTIFICATION_STAT_KEY]: 5,
				},
				population: {},
				lands: [],
			},
		};

		const rules: RuleSet = {
			defaultActionAPCost: 1,
			absorptionCapPct: 1,
			absorptionRounding: 'down',
			tieredResourceKey: SYNTHETIC_RESOURCES.happiness.id,
			// The happiness key uses the same fallback iconography described in
			// the domain migration inventory (✨ modifier icon and 🧹 upkeep).
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 1,
			winConditions: [],
		};

		const ctx = createEngine({
			actions: factory.actions,
			buildings: factory.buildings,
			developments: factory.developments,
			populations: factory.populations,
			phases,
			start,
			rules,
		});

		const translation = createTranslationContextForEngine(ctx, (registries) => {
			const raid = ctx.actions.get(attackAction.id);
			const festivalDef = ctx.actions.get(festivalAction.id);
			for (const resource of Object.values(SYNTHETIC_RESOURCES)) {
				registries.resources[resource.id] = {
					key: resource.id,
					icon: resource.icon,
					label: resource.label,
				};
			}
			if (raid) {
				registries.actions.add(raid.id, {
					...raid,
				});
			}
			if (festivalDef) {
				registries.actions.add(festivalDef.id, {
					...festivalDef,
				});
			}
		});

		return {
			ctx,
			translation,
			festivalActionId: festivalAction.id,
			attackActionId: attackAction.id,
			resources: RESOURCE_LOOKUP,
		};
	};

export const getSyntheticFestivalDetails = (
	scenario: SyntheticFestivalScenario,
) => {
	const { ctx, translation, festivalActionId, attackActionId, resources } =
		scenario;
	const festival = ctx.actions.get(festivalActionId)!;
	const happinessEff = festival.effects.find(
		(e: EffectDef) => e.type === 'resource',
	) as EffectDef<{ key: SyntheticResourceId; amount: number }>;
	const happinessInfo = translation.assets.resources[happinessEff.params.key] ??
		resources[happinessEff.params.key] ?? {
			icon: '',
			label: happinessEff.params.key,
		};
	const happinessAmt = Number(happinessEff.params.amount);
	const fortEff = festival.effects.find(
		(e: EffectDef) => e.type === 'stat',
	) as EffectDef<{ key: string; amount: number }>;
	const fortInfo = translation.assets.stats[fortEff.params.key] ??
		translation.assets.stats[FORTIFICATION_STAT_KEY] ?? {
			icon: '',
			label: fortEff.params.key,
		};
	const fortAmt =
		fortEff.method === 'remove'
			? -Number(fortEff.params.amount)
			: Number(fortEff.params.amount);
	const passive = festival.effects.find(
		(e: EffectDef) => e.type === 'passive',
	) as EffectDef;
	const passiveMeta = passive.params as
		| { name?: string; icon?: string }
		| undefined;
	const resMod = passive.effects?.find(
		(e: EffectDef) => e.type === 'result_mod',
	) as EffectDef;
	const innerRes = resMod.effects?.find(
		(e: EffectDef) =>
			e.type === 'resource' &&
			(e.params as { key?: string }).key === SYNTHETIC_RESOURCES.happiness.id,
	) as EffectDef<{ amount: number }>;
	const penaltyAmt =
		innerRes.method === 'remove'
			? -Number(innerRes.params.amount)
			: Number(innerRes.params.amount);
	const armyAttack = ctx.actions.get(attackActionId)!;
	const upkeepPhase = ctx.phases.find((phase) =>
		phase.steps.some((step) => step.triggers?.includes(ON_UPKEEP_PHASE)),
	);
	const upkeepTrigger = translation.assets.triggers[ON_UPKEEP_PHASE];
	const upkeepLabel =
		upkeepPhase?.label ??
		upkeepTrigger?.label ??
		upkeepTrigger?.past ??
		FALLBACK_UPKEEP.label;
	const upkeepIcon =
		upkeepPhase?.icon ?? upkeepTrigger?.icon ?? FALLBACK_UPKEEP.icon;
	const modifierInfo =
		translation.assets.modifiers.result ?? SYNTHETIC_RESULT_MODIFIER;

	return {
		festival,
		armyAttack,
		happinessInfo,
		happinessIcon: happinessInfo.icon,
		happinessAmt,
		fortInfo,
		fortIcon: fortInfo.icon,
		fortAmt,
		passiveName: passiveMeta?.name,
		passiveIcon: passiveMeta?.icon,
		penaltyAmt,
		upkeepLabel,
		upkeepIcon,
		modifierInfo,
	};
};
