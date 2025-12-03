import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import { createSessionSnapshot } from '../helpers/sessionFixtures';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import type { TranslationContext } from '../../src/translation/context/types';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import {
	FALLBACK_UPKEEP,
	FORTIFICATION_STAT_KEY,
	ON_UPKEEP_PHASE,
	RESOURCE_LOOKUP,
	SYNTHETIC_PHASES,
	SYNTHETIC_RESOURCES,
	SYNTHETIC_RESULT_MODIFIER,
	buildFestivalPassiveRecord,
	buildFestivalRuleSnapshot,
	createFestivalMetadata,
	createFestivalPlayers,
	type SyntheticResourceId,
} from './syntheticFestival.shared';

export interface SyntheticFestivalScenario {
	translation: TranslationContext;
	registries: SessionRegistries;
	session: SessionSnapshot;
	festivalActionId: string;
	attackActionId: string;
	resources: Readonly<
		Record<SyntheticResourceId, { icon: string; label: string }>
	>;
}

const createFestivalActions = () => {
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
					resourceId: SYNTHETIC_RESOURCES.happiness.id,
					change: { type: 'amount', amount: 4 },
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
									resourceId: SYNTHETIC_RESOURCES.happiness.id,
									change: { type: 'amount', amount: 2 },
								},
							},
						],
					},
				],
			},
		],
	});
	return { attackAction, festivalAction, passiveId };
};

export const createSyntheticFestivalScenario =
	(): SyntheticFestivalScenario => {
		const { attackAction, festivalAction, passiveId } = createFestivalActions();
		const registries = createSessionRegistries();
		for (const resource of Object.values(SYNTHETIC_RESOURCES)) {
			registries.resources[resource.id] = {
				key: resource.id,
				icon: resource.icon,
				label: resource.label,
			};
		}
		registries.actions.add(attackAction.id, { ...attackAction });
		registries.actions.add(festivalAction.id, { ...festivalAction });
		const metadata = createFestivalMetadata();
		const baseResources = Object.fromEntries(
			Object.keys(registries.resources).map((key) => [key, 0]),
		);
		const [active, opponent] = createFestivalPlayers(baseResources);
		const upkeepPenalty = {
			type: 'resource',
			method: 'remove',
			params: { key: SYNTHETIC_RESOURCES.happiness.id, amount: 2 },
		} satisfies EffectDef;
		const passiveRecords = {
			[active.id]: [
				buildFestivalPassiveRecord(active.id, passiveId, '🤮', upkeepPenalty),
			],
			[opponent.id]: [],
		};
		const session = createSessionSnapshot({
			players: [active, opponent],
			activePlayerId: active.id,
			opponentId: opponent.id,
			phases: SYNTHETIC_PHASES,
			actionCostResource: SYNTHETIC_RESOURCES.actionPoints.id,
			ruleSnapshot: buildFestivalRuleSnapshot(SYNTHETIC_RESOURCES.happiness.id),
			passiveRecords,
			metadata,
		});
		const translation = createTranslationContext(
			session,
			registries,
			session.metadata,
			{
				ruleSnapshot: session.rules,
				passiveRecords: session.passiveRecords,
			},
		);
		return {
			translation,
			registries,
			session,
			festivalActionId: festivalAction.id,
			attackActionId: attackAction.id,
			resources: RESOURCE_LOOKUP,
		};
	};

export const getSyntheticFestivalDetails = (
	scenario: SyntheticFestivalScenario,
) => {
	const {
		registries,
		translation,
		festivalActionId,
		attackActionId,
		resources,
	} = scenario;
	const festival = registries.actions.get(festivalActionId);
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
	const armyAttack = registries.actions.get(attackActionId);
	const upkeepPhase = scenario.session.phases.find((phase) =>
		phase.steps?.some((step) => step.triggers?.includes(ON_UPKEEP_PHASE)),
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
