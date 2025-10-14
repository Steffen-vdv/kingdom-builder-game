import { createContentFactory } from '@kingdom-builder/testing';
import type { ActionConfig, EffectDef } from '@kingdom-builder/protocol';
import type { TranslationContext } from '../../src/translation/context/types';
import { buildSyntheticTranslationContext } from '../helpers/createSyntheticTranslationContext';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';

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

interface SyntheticFestivalCtx {
	actions: { get(id: string): ActionConfig };
	phases: SessionSnapshot['phases'];
}

export interface SyntheticFestivalScenario {
	ctx: SyntheticFestivalCtx;
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

		const synthetic = buildSyntheticTranslationContext(
			({ session, registries, metadata }) => {
				session.phases = phases;
				session.rules.tieredResourceKey = SYNTHETIC_RESOURCES.happiness.id;
				session.actionCostResource = SYNTHETIC_RESOURCES.actionPoints.id;
				const [active] = session.game.players;
				if (active) {
					active.resources = {
						[SYNTHETIC_RESOURCES.actionPoints.id]: 3,
						[SYNTHETIC_RESOURCES.happiness.id]: 0,
					};
					active.stats = { [FORTIFICATION_STAT_KEY]: 5 };
					active.actions = [attackAction.id, festivalAction.id];
				}
				registries.actions.add(
					attackAction.id,
					structuredClone(factory.actions.get(attackAction.id)),
				);
				registries.actions.add(
					festivalAction.id,
					structuredClone(factory.actions.get(festivalAction.id)),
				);
				for (const resource of Object.values(SYNTHETIC_RESOURCES)) {
					registries.resources[resource.id] = {
						key: resource.id,
						icon: resource.icon,
						label: resource.label,
					};
				}
				metadata.resources = {
					...(metadata.resources ?? {}),
					...Object.fromEntries(
						Object.values(SYNTHETIC_RESOURCES).map((entry) => [
							entry.id,
							{ icon: entry.icon, label: entry.label },
						]),
					),
				};
				metadata.phases = {
					...(metadata.phases ?? {}),
					[phases[0]?.id ?? 'phase:synthetic:main']: {
						id: phases[0]?.id,
						label: phases[0]?.label,
						icon: phases[0]?.icon,
					},
					[phases[1]?.id ?? 'phase:synthetic:rest']: {
						id: phases[1]?.id,
						label: phases[1]?.label,
						icon: phases[1]?.icon,
					},
				};
				metadata.triggers = {
					...(metadata.triggers ?? {}),
					[ON_UPKEEP_PHASE]: {
						icon: FALLBACK_UPKEEP.icon,
						label: FALLBACK_UPKEEP.label,
						past: FALLBACK_UPKEEP.label,
					},
				};
			},
		);

		const ctx: SyntheticFestivalCtx = {
			actions: {
				get(id: string) {
					return synthetic.registries.actions.get(id);
				},
			},
			phases: synthetic.session.phases,
		};

		return {
			ctx,
			translation: synthetic.translationContext,
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
