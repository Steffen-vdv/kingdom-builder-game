import { describe, it, expect } from 'vitest';
import {
	Resource,
	happinessPassiveId,
	type HappinessTierSlug,
} from '@kingdom-builder/contents';
import { createTestContext } from './fixtures';
import { translateTierSummary } from '../../packages/web/src/translation/content/tierSummaries';
import { createTranslationContextForEngine } from '../../packages/web/tests/helpers/createTranslationContextForEngine';

type PassiveTier = Exclude<HappinessTierSlug, 'steady'>;

const passiveIds: Record<PassiveTier, string> = {
	content: happinessPassiveId('content'),
	despair: happinessPassiveId('despair'),
	ecstatic: happinessPassiveId('ecstatic'),
	elated: happinessPassiveId('elated'),
	grim: happinessPassiveId('grim'),
	joyful: happinessPassiveId('joyful'),
	misery: happinessPassiveId('misery'),
	unrest: happinessPassiveId('unrest'),
};

const removalTokens = {
	content: 'happiness stays between +3 and +4',
	despair: 'happiness is -10 or lower',
	ecstatic: 'happiness is +10 or higher',
	elated: 'happiness stays between +8 and +9',
	grim: 'happiness stays between -7 and -5',
	joyful: 'happiness stays between +5 and +7',
	misery: 'happiness stays between -9 and -8',
	unrest: 'happiness stays between -4 and -3',
} as const;

const summaryTokens = {
	content: 'happiness.tier.summary.content',
	despair: 'happiness.tier.summary.despair',
	ecstatic: 'happiness.tier.summary.ecstatic',
	elated: 'happiness.tier.summary.elated',
	grim: 'happiness.tier.summary.grim',
	joyful: 'happiness.tier.summary.joyful',
	misery: 'happiness.tier.summary.misery',
	unrest: 'happiness.tier.summary.unrest',
} as const;

const summaryTexts = {
	content: 'During income step, gain 25% more 🪙 gold (rounded up).',
	despair: [
		'During income step, gain 50% less 🪙 gold (rounded up).',
		'Skip Growth phase.',
		'Skip War Recovery step during Upkeep phase.',
	].join('\n'),
	ecstatic: [
		'During income step, gain 50% more 🪙 gold (rounded up).',
		'All actions cost 20% less 🪙 gold (rounded up).',
		'Gain +20% 📈 Growth.',
	].join('\n'),
	elated: [
		'During income step, gain 50% more 🪙 gold (rounded up).',
		'All actions cost 20% less 🪙 gold (rounded up).',
	].join('\n'),
	grim: [
		'During income step, gain 25% less 🪙 gold (rounded up).',
		'Skip Growth phase.',
	].join('\n'),
	joyful: [
		'During income step, gain 25% more 🪙 gold (rounded up).',
		'All actions cost 20% less 🪙 gold (rounded up).',
	].join('\n'),
	misery: [
		'During income step, gain 50% less 🪙 gold (rounded up).',
		'Skip Growth phase.',
	].join('\n'),
	unrest: 'During income step, gain 25% less 🪙 gold (rounded up).',
} as const;

const createPassive = (tier: keyof typeof passiveIds) => ({
	id: passiveIds[tier],
	removalToken: removalTokens[tier],
	summary: summaryTexts[tier],
	summaryToken: summaryTokens[tier],
});

const passivesByTier = {
	content: [createPassive('content')],
	despair: [createPassive('despair')],
	ecstatic: [createPassive('ecstatic')],
	elated: [createPassive('elated')],
	grim: [createPassive('grim')],
	joyful: [createPassive('joyful')],
	misery: [createPassive('misery')],
	steady: [],
	unrest: [createPassive('unrest')],
} as const;

const skipPhasesByTier: Partial<
	Record<keyof typeof passiveIds, Record<string, Record<string, boolean>>>
> = {
	despair: {
		growth: {
			[passiveIds.despair]: true,
		},
	},
	grim: {
		growth: {
			[passiveIds.grim]: true,
		},
	},
	misery: {
		growth: {
			[passiveIds.misery]: true,
		},
	},
} as const;

const skipStepsByTier: Partial<
	Record<
		keyof typeof passiveIds,
		Record<string, Record<string, Record<string, boolean>>>
	>
> = {
	despair: {
		upkeep: {
			'war-recovery': {
				[passiveIds.despair]: true,
			},
		},
	},
} as const;

describe('content happiness tiers', () => {
	it('exposes tier passive metadata for web presentation', () => {
		const engineContext = createTestContext();
		const player = engineContext.activePlayer;
		const tiersById = new Map(
			engineContext.services.rules.tierDefinitions.map((tier) => [
				tier.id,
				tier,
			]),
		);
		const samples = [
			{ value: -10, label: 'despair' },
			{ value: -8, label: 'misery' },
			{ value: -5, label: 'grim' },
			{ value: -3, label: 'unrest' },
			{ value: 0, label: 'steady' },
			{ value: 3, label: 'content' },
			{ value: 5, label: 'joyful' },
			{ value: 8, label: 'elated' },
			{ value: 10, label: 'ecstatic' },
		] as const;

		const snapshot: Record<string, unknown> = {};

		const happinessResourceId = player.getResourceV2Id(Resource.happiness);
		for (const sample of samples) {
			player.resources[Resource.happiness] = sample.value;
			engineContext.services.handleTieredResourceChange(
				engineContext,
				player,
				Resource.happiness,
			);

			const translationContext =
				createTranslationContextForEngine(engineContext);
			const passives = engineContext.passives
				.values(player.id)
				.map((passive) => {
					const sourceId = passive.meta?.source?.id;
					const tier = sourceId ? tiersById.get(sourceId) : undefined;
					const summaryToken = tier?.display?.summaryToken;
					const summary = translateTierSummary(
						summaryToken,
						translationContext.assets,
					);
					const removalToken = passive.meta?.removal?.token;
					return {
						id: passive.id,
						removalToken,
						summary,
						summaryToken,
					};
				});

			snapshot[sample.label] = {
				valuesV2: {
					[happinessResourceId]: player.resourceValues[happinessResourceId],
				},
				passives,
				skipPhases: JSON.parse(JSON.stringify(player.skipPhases)),
				skipSteps: JSON.parse(JSON.stringify(player.skipSteps)),
			};
		}

		expect(snapshot).toEqual({
			content: {
				valuesV2: { [happinessResourceId]: 3 },
				passives: passivesByTier.content,
				skipPhases: skipPhasesByTier.content ?? {},
				skipSteps: skipStepsByTier.content ?? {},
			},
			despair: {
				valuesV2: { [happinessResourceId]: -10 },
				passives: passivesByTier.despair,
				skipPhases: skipPhasesByTier.despair ?? {},
				skipSteps: skipStepsByTier.despair ?? {},
			},
			ecstatic: {
				valuesV2: { [happinessResourceId]: 10 },
				passives: passivesByTier.ecstatic,
				skipPhases: skipPhasesByTier.ecstatic ?? {},
				skipSteps: skipStepsByTier.ecstatic ?? {},
			},
			elated: {
				valuesV2: { [happinessResourceId]: 8 },
				passives: passivesByTier.elated,
				skipPhases: skipPhasesByTier.elated ?? {},
				skipSteps: skipStepsByTier.elated ?? {},
			},
			grim: {
				valuesV2: { [happinessResourceId]: -5 },
				passives: passivesByTier.grim,
				skipPhases: skipPhasesByTier.grim ?? {},
				skipSteps: skipStepsByTier.grim ?? {},
			},
			joyful: {
				valuesV2: { [happinessResourceId]: 5 },
				passives: passivesByTier.joyful,
				skipPhases: skipPhasesByTier.joyful ?? {},
				skipSteps: skipStepsByTier.joyful ?? {},
			},
			misery: {
				valuesV2: { [happinessResourceId]: -8 },
				passives: passivesByTier.misery,
				skipPhases: skipPhasesByTier.misery ?? {},
				skipSteps: skipStepsByTier.misery ?? {},
			},
			steady: {
				valuesV2: { [happinessResourceId]: 0 },
				passives: passivesByTier.steady,
				skipPhases: skipPhasesByTier.steady ?? {},
				skipSteps: skipStepsByTier.steady ?? {},
			},
			unrest: {
				valuesV2: { [happinessResourceId]: -3 },
				passives: passivesByTier.unrest,
				skipPhases: skipPhasesByTier.unrest ?? {},
				skipSteps: skipStepsByTier.unrest ?? {},
			},
		});
	});
});
