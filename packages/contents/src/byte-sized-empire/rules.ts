/**
 * Byte-Sized Empire — Rules & Happiness Tiers
 *
 * Game rules, win conditions, and the nine happiness tiers
 * for the score-based engine-builder game mode.
 */
import type { EffectConfig, HappinessTierDefinition, RuleSet, WinConditionDefinition } from '@boardsmith/protocol';
import {
	effect,
	happinessTier,
	passiveParams,
	winCondition,
	resourceChange,
	resultModParams,
	globalTarget,
	Types,
	ResourceMethods,
	ResultModMethods,
	PassiveMethods,
	formatPassiveRemoval,
} from '@boardsmith/contents-sdk';
import { Res, Phase } from './ids';

// ═══════════════════════════════════════════════════════════════════
// TIER HELPERS
// ═══════════════════════════════════════════════════════════════════

type BseTierConfig = {
	slug: string;
	icon: string;
	name: string;
	range: { min: number; max?: number };
	incomeMultiplier: number;
	disableGrowth?: boolean;
	skipPhases?: string[];
	summary: string;
	removal: string;
	effects?: EffectConfig[];
};

const tierId = (slug: string) => `bse:happiness:tier:${slug}`;
const passiveId = (slug: string) => `passive:bse:happiness:${slug}`;
const modId = (slug: string, kind: string) => `bse:happiness:${slug}:${kind}`;

function gainModifier(slug: string, pct: number): EffectConfig {
	return effect(Types.ResultMod, ResultModMethods.ADD)
		.round('up')
		.params(resultModParams().id(modId(slug, 'resource-gain')).evaluation(globalTarget()).percent(pct).build())
		.build();
}

function resAdd(resourceId: string, amount: number): EffectConfig {
	return effect(Types.Resource, ResourceMethods.ADD).params(resourceChange(resourceId).amount(amount).build()).build();
}

function buildTier(cfg: BseTierConfig): HappinessTierDefinition {
	const id = tierId(cfg.slug);
	const pId = passiveId(cfg.slug);
	const token = `bse.happiness.tier.summary.${cfg.slug}`;
	const removalText = formatPassiveRemoval(cfg.removal);

	const builder = happinessTier(id)
		.range(cfg.range.min, cfg.range.max)
		.incomeMultiplier(cfg.incomeMultiplier)
		.text((t) => t.summary(cfg.summary).removal(removalText))
		.display((d) => d.title(cfg.name).icon(cfg.icon).removalCondition(cfg.removal));

	if (cfg.disableGrowth) {
		builder.disableGrowth();
	}

	if (cfg.effects) {
		const params = passiveParams()
			.id(pId)
			.name(cfg.name)
			.icon(cfg.icon)
			.detail(token)
			.meta({
				source: {
					type: 'tiered-resource',
					id,
					labelToken: token,
					icon: cfg.icon,
				},
				removal: { token: cfg.removal, text: removalText },
			});

		if (cfg.skipPhases) {
			for (const phase of cfg.skipPhases) {
				params.skipPhase(phase);
			}
		}

		const passiveBuilder = effect().type(Types.Passive).method(PassiveMethods.ADD).params(params);

		for (const entry of cfg.effects) {
			passiveBuilder.effect(entry);
		}

		builder.passive(passiveBuilder.build());
	}

	return builder.build();
}

// ═══════════════════════════════════════════════════════════════════
// TIER CONFIGS
// ═══════════════════════════════════════════════════════════════════

const TIER_CONFIGS: BseTierConfig[] = [
	{
		slug: 'revolt',
		icon: '\u{1F621}',
		name: 'Revolt',
		range: { min: Number.MIN_SAFE_INTEGER, max: -6 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [Phase.growth],
		summary: 'Gain 50% less resources.\n' + 'Skip Growth phase.\n' + '-1 Population per turn.',
		removal: 'happiness is -6 or lower',
		effects: [gainModifier('revolt', -0.5), resAdd(Res.population, -1)],
	},
	{
		slug: 'despair',
		icon: '\u{1F62D}',
		name: 'Despair',
		range: { min: -5, max: -4 },
		incomeMultiplier: 0.7,
		summary: 'Gain 30% less resources.\nCannot Recruit.',
		removal: 'happiness stays between -5 and -4',
		effects: [gainModifier('despair', -0.3)],
	},
	{
		slug: 'discontent',
		icon: '\u{1F61E}',
		name: 'Discontent',
		range: { min: -3, max: -2 },
		incomeMultiplier: 0.85,
		summary: 'Gain 15% less resources.\n' + 'Cannot build Monument.',
		removal: 'happiness stays between -3 and -2',
		effects: [gainModifier('discontent', -0.15)],
	},
	{
		slug: 'uneasy',
		icon: '\u{1F615}',
		name: 'Uneasy',
		range: { min: -1, max: -1 },
		incomeMultiplier: 1.0,
		summary: '-1 Gold per turn.',
		removal: 'happiness is -1',
		effects: [resAdd(Res.gold, -1)],
	},
	{
		slug: 'content',
		icon: '\u{1F610}',
		name: 'Content',
		range: { min: 0, max: 0 },
		incomeMultiplier: 1.0,
		summary: 'No effect.',
		removal: 'happiness is 0',
	},
	{
		slug: 'satisfied',
		icon: '\u{1F642}',
		name: 'Satisfied',
		range: { min: 1, max: 2 },
		incomeMultiplier: 1.1,
		summary: '+1 Gold per turn.',
		removal: 'happiness stays between +1 and +2',
		effects: [resAdd(Res.gold, 1)],
	},
	{
		slug: 'happy',
		icon: '\u{1F60A}',
		name: 'Happy',
		range: { min: 3, max: 4 },
		incomeMultiplier: 1.25,
		summary: 'Gain 25% more resources.\n' + '+1 all resource income.',
		removal: 'happiness stays between +3 and +4',
		effects: [gainModifier('happy', 0.25)],
	},
	{
		slug: 'prosperous',
		icon: '\u{1F929}',
		name: 'Prosperous',
		range: { min: 5, max: 6 },
		incomeMultiplier: 1.4,
		summary: 'Gain 40% more resources.\n+1 AP.',
		removal: 'happiness stays between +5 and +6',
		effects: [gainModifier('prosperous', 0.4), resAdd(Res.ap, 1)],
	},
	{
		slug: 'golden-age',
		icon: '\u{1F31F}',
		name: 'Golden Age',
		range: { min: 7 },
		incomeMultiplier: 1.5,
		summary: 'Gain 50% more resources.\n+1 VP per turn.',
		removal: 'happiness is +7 or higher',
		effects: [gainModifier('golden-age', 0.5), resAdd(Res.vp, 1)],
	},
];

const tierDefinitions: HappinessTierDefinition[] = TIER_CONFIGS.map(buildTier);

// ═══════════════════════════════════════════════════════════════════
// WIN CONDITIONS
// ═══════════════════════════════════════════════════════════════════

const WIN_CONDITIONS: WinConditionDefinition[] = [
	winCondition('castle-destroyed')
		.resourceAtMost(Res.castleHP, 0)
		.subjectDefeat()
		.opponentVictory()
		.display((d) =>
			d
				.icon(Res.castleHP)
				.victory('The enemy stronghold crumbles\u2014' + 'your empire reigns supreme!')
				.defeat('Your castle has fallen. ' + 'The empire is lost.'),
		)
		.build(),
	{
		id: 'score-victory',
		trigger: {
			type: 'turn-limit',
			maxTurns: 30,
			scoreResourceId: Res.vp,
		},
		result: { subject: 'victory' },
		display: {
			icon: Res.vp,
			victory: 'The ages have passed\u2014your legacy ' + 'outshines all rivals!',
			defeat: "Time runs out. Your rival's score " + 'eclipses your own.',
		},
	},
];

// ═══════════════════════════════════════════════════════════════════
// RULES EXPORT
// ═══════════════════════════════════════════════════════════════════

export const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: Res.happiness,
	tierDefinitions,
	slotsPerNewLand: 2,
	maxSlotsPerLand: 2,
	basePopulationCap: 5,
	winConditions: WIN_CONDITIONS,
	corePhaseIds: {
		growth: Phase.growth,
		upkeep: Phase.upkeep,
	},
};
