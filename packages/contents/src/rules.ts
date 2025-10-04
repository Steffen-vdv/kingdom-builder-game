import type {
	RuleSet,
	HappinessTierDefinition,
} from '@kingdom-builder/engine/services';
import type { EffectConfig } from '@kingdom-builder/engine/config/schema';
import { Resource } from './resources';
import { Stat } from './stats';
import {
	Types,
	CostModMethods,
	ResultModMethods,
	StatMethods,
	costModParams,
	evaluationTarget,
	happinessTier,
	resultModParams,
	statParams,
	effect,
	passiveParams,
	PassiveMethods,
} from './config/builders';

const GROWTH_PHASE_ID = 'growth';
const UPKEEP_PHASE_ID = 'upkeep';
const WAR_RECOVERY_STEP_ID = 'war-recovery';
const BUILD_ACTION_ID = 'build';

const DEVELOPMENT_EVALUATION = evaluationTarget('development');
const incomeModifier = (id: string, percent: number) =>
	({
		type: Types.ResultMod,
		method: ResultModMethods.ADD,
		params: resultModParams()
			.id(id)
			.evaluation(DEVELOPMENT_EVALUATION)
			.percent(percent)
			.build(),
	}) as const;

const buildingDiscountModifier = (id: string) =>
	({
		type: Types.CostMod,
		method: CostModMethods.ADD,
		params: costModParams()
			.id(id)
			.actionId(BUILD_ACTION_ID)
			.key(Resource.gold)
			.percent(-0.2)
			.build(),
	}) as const;

const growthBonusEffect = (amount: number) =>
	({
		type: Types.Stat,
		method: StatMethods.ADD,
		params: statParams().key(Stat.growth).amount(amount).build(),
	}) as const;

const formatRemoval = (description: string) => `Removed when ${description}`;

type TierPassiveEffectOptions = {
	tierId: string;
	summary: string;
	removalDetail: string;
	params: ReturnType<typeof passiveParams>;
	effects?: EffectConfig[];
};

function createTierPassiveEffect({
	tierId,
	summary,
	removalDetail,
	params,
	effects = [],
}: TierPassiveEffectOptions) {
	params.detail(summary);
	params.meta({
		source: { type: 'tiered-resource', id: tierId },
		removal: { token: removalDetail, text: formatRemoval(removalDetail) },
	});
	const builder = effect()
		.type(Types.Passive)
		.method(PassiveMethods.ADD)
		.params(params);
	effects.forEach((entry) => builder.effect(entry));
	return builder;
}

type TierConfig = {
	id: string;
	passiveId: string;
	range: { min: number; max?: number };
	incomeMultiplier: number;
	buildingDiscountPct?: number;
	growthBonusPct?: number;
	disableGrowth?: boolean;
	skipPhases?: string[];
	skipSteps?: Array<{ phase: string; step: string }>;
	summary: string;
	removal: string;
	effects?: EffectConfig[];
};

const TIER_CONFIGS: TierConfig[] = [
	{
		id: 'happiness:tier:despair',
		passiveId: 'passive:happiness:despair',
		range: { min: -10 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [GROWTH_PHASE_ID],
		skipSteps: [{ phase: UPKEEP_PHASE_ID, step: WAR_RECOVERY_STEP_ID }],
		summary: '💰 Income -50%. ⏭️ Skip Growth. 🛡️ War Recovery skipped.',
		removal: 'happiness rises to -9 or higher',
		effects: [incomeModifier('happiness:despair:income', -0.5)],
	},
	{
		id: 'happiness:tier:misery',
		passiveId: 'passive:happiness:misery',
		range: { min: -9, max: -8 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [GROWTH_PHASE_ID],
		summary: '💰 Income -50%. ⏭️ Skip Growth while morale is ' + 'desperate.',
		removal: 'happiness leaves the -9 to -8 range',
		effects: [incomeModifier('happiness:misery:income', -0.5)],
	},
	{
		id: 'happiness:tier:grim',
		passiveId: 'passive:happiness:grim',
		range: { min: -7, max: -5 },
		incomeMultiplier: 0.75,
		disableGrowth: true,
		skipPhases: [GROWTH_PHASE_ID],
		summary: '💰 Income -25%. ⏭️ Skip Growth until spirits recover.',
		removal: 'happiness leaves the -7 to -5 range',
		effects: [incomeModifier('happiness:grim:income', -0.25)],
	},
	{
		id: 'happiness:tier:unrest',
		passiveId: 'passive:happiness:unrest',
		range: { min: -4, max: -3 },
		incomeMultiplier: 0.75,
		summary: '💰 Income -25% while unrest simmers.',
		removal: 'happiness leaves the -4 to -3 range',
		effects: [incomeModifier('happiness:unrest:income', -0.25)],
	},
	{
		id: 'happiness:tier:steady',
		passiveId: 'passive:happiness:steady',
		range: { min: -2, max: 2 },
		incomeMultiplier: 1,
		summary: 'Morale is steady. No tier bonuses are active.',
		removal: 'happiness leaves the -2 to +2 range',
	},
	{
		id: 'happiness:tier:content',
		passiveId: 'passive:happiness:content',
		range: { min: 3, max: 4 },
		incomeMultiplier: 1.2,
		summary: '💰 Income +20% while the realm is content.',
		removal: 'happiness leaves the +3 to +4 range',
		effects: [incomeModifier('happiness:content:income', 0.2)],
	},
	{
		id: 'happiness:tier:joyful',
		passiveId: 'passive:happiness:joyful',
		range: { min: 5, max: 7 },
		incomeMultiplier: 1.25,
		buildingDiscountPct: 0.2,
		summary: '💰 Income +25%. 🏛️ Building costs reduced by 20%.',
		removal: 'happiness leaves the +5 to +7 range',
		effects: [
			incomeModifier('happiness:joyful:income', 0.25),
			buildingDiscountModifier('happiness:joyful:build-discount'),
		],
	},
	{
		id: 'happiness:tier:elated',
		passiveId: 'passive:happiness:elated',
		range: { min: 8, max: 9 },
		incomeMultiplier: 1.5,
		buildingDiscountPct: 0.2,
		summary: '💰 Income +50%. 🏛️ Building costs reduced by 20%.',
		removal: 'happiness leaves the +8 to +9 range',
		effects: [
			incomeModifier('happiness:elated:income', 0.5),
			buildingDiscountModifier('happiness:elated:build-discount'),
		],
	},
	{
		id: 'happiness:tier:ecstatic',
		passiveId: 'passive:happiness:ecstatic',
		range: { min: 10 },
		incomeMultiplier: 1.5,
		buildingDiscountPct: 0.2,
		growthBonusPct: 0.2,
		summary:
			'💰 Income +50%. 🏛️ Building costs reduced by 20%. ' + '📈 Growth +20%.',
		removal: 'happiness drops below +10',
		effects: [
			incomeModifier('happiness:ecstatic:income', 0.5),
			buildingDiscountModifier('happiness:ecstatic:build-discount'),
			growthBonusEffect(0.2),
		],
	},
];

function buildTierDefinition(config: TierConfig): HappinessTierDefinition {
	const params = passiveParams().id(config.passiveId);
	config.skipPhases?.forEach((phaseId) => params.skipPhase(phaseId));
	config.skipSteps?.forEach(({ phase, step }) => {
		params.skipStep(phase, step);
	});
	const passive = createTierPassiveEffect({
		tierId: config.id,
		summary: config.summary,
		removalDetail: config.removal,
		params,
		...(config.effects ? { effects: config.effects } : {}),
	});
	const builder = happinessTier(config.id)
		.range(config.range.min, config.range.max)
		.incomeMultiplier(config.incomeMultiplier)
		.passive(passive)
		.text((text) => {
			text.summary(config.summary).removal(formatRemoval(config.removal));
			return text;
		})
		.display((display) => display.removalCondition(config.removal));
	if (config.disableGrowth) {
		builder.disableGrowth();
	}
	if (config.buildingDiscountPct) {
		builder.buildingDiscountPct(config.buildingDiscountPct);
	}
	if (config.growthBonusPct) {
		builder.growthBonusPct(config.growthBonusPct);
	}
	return builder.build();
}

const tierDefinitions: HappinessTierDefinition[] = TIER_CONFIGS.map((config) =>
	buildTierDefinition(config),
);

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: Resource.happiness,
	tierDefinitions,
	slotsPerNewLand: 1,
	maxSlotsPerLand: 2,
	basePopulationCap: 1,
};
