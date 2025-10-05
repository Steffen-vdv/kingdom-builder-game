import {
	createEngine,
	type EffectDef,
	type RuleSet,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	STATS,
	PHASES,
	PhaseId,
	PhaseTrigger,
	Resource,
	Stat,
} from '@kingdom-builder/contents';
import { createContentFactory } from '../../../engine/tests/factories/content';

const ON_UPKEEP_PHASE = PhaseTrigger.OnUpkeepPhase;

export interface SyntheticFestivalScenario {
	ctx: ReturnType<typeof createEngine>;
	festivalActionId: string;
	attackActionId: string;
}

export const createSyntheticFestivalScenario =
	(): SyntheticFestivalScenario => {
		const factory = createContentFactory();
		const attackAction = factory.action({
			name: 'Synthetic Raid',
			icon: '⚔️',
			baseCosts: { [Resource.ap]: 1 },
		});
		const passiveId = 'passive:synthetic:festival-hangover';
		const resultModId = 'result:synthetic:festival-penalty';
		const festivalAction = factory.action({
			name: 'Synthetic Festival',
			icon: '🎊',
			baseCosts: { [Resource.ap]: 1 },
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: Resource.happiness, amount: 4 },
				},
				{
					type: 'stat',
					method: 'remove',
					params: {
						key: Stat.fortificationStrength,
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
										key: Resource.happiness,
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
					[Resource.ap]: 3,
					[Resource.happiness]: 0,
				},
				stats: {
					[Stat.fortificationStrength]: 5,
				},
				population: {},
				lands: [],
			},
		};

		const rules: RuleSet = {
			defaultActionAPCost: 1,
			absorptionCapPct: 1,
			absorptionRounding: 'down',
			tieredResourceKey: Resource.happiness,
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 1,
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

		return {
			ctx,
			festivalActionId: festivalAction.id,
			attackActionId: attackAction.id,
		};
	};

export const getSyntheticFestivalDetails = (
	ctx: SyntheticFestivalScenario['ctx'],
	festivalActionId: string,
	attackActionId: string,
) => {
	const festival = ctx.actions.get(festivalActionId)!;
	const happinessEff = festival.effects.find(
		(e: EffectDef) => e.type === 'resource',
	) as EffectDef<{ key: string; amount: number }>;
	const happinessInfo =
		RESOURCES[happinessEff.params.key as keyof typeof RESOURCES];
	const happinessAmt = Number(happinessEff.params.amount);
	const fortEff = festival.effects.find(
		(e: EffectDef) => e.type === 'stat',
	) as EffectDef<{ key: string; amount: number }>;
	const fortInfo = STATS[fortEff.params.key as keyof typeof STATS];
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
			(e.params as { key?: string }).key === Resource.happiness,
	) as EffectDef<{ amount: number }>;
	const penaltyAmt =
		innerRes.method === 'remove'
			? -Number(innerRes.params.amount)
			: Number(innerRes.params.amount);
	const armyAttack = ctx.actions.get(attackActionId)!;
	const upkeepPhase =
		ctx.phases.find((phase) =>
			phase.steps.some((step) => step.triggers?.includes(ON_UPKEEP_PHASE)),
		) ??
		PHASES.find((phaseDefinition) =>
			phaseDefinition.steps.some((step) =>
				step.triggers?.includes(ON_UPKEEP_PHASE),
			),
		) ??
		ctx.phases.find(
			(phaseDefinition) => phaseDefinition.id === PhaseId.Upkeep,
		) ??
		PHASES.find((phaseDefinition) => phaseDefinition.id === PhaseId.Upkeep);
	const upkeepLabel = upkeepPhase?.label || 'Upkeep';
	const upkeepIcon = upkeepPhase?.icon;

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
	};
};
