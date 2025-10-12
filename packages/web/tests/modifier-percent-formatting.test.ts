import { describe, expect, it } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { formatStatValue } from '../src/utils/stats';
import type { EffectDef, PlayerId } from '@kingdom-builder/engine';
import {
	createTranslationContext,
	selectStatDisplay,
} from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

function createContext() {
	const scaffold = createTestSessionScaffold();
	const activePlayer = createSnapshotPlayer({
		id: 'player:active' as PlayerId,
	});
	const opponent = createSnapshotPlayer({
		id: 'player:opponent' as PlayerId,
	});
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
	});
	return {
		context: createTranslationContext(
			session,
			scaffold.registries,
			session.metadata,
			{
				ruleSnapshot: session.rules,
				passiveRecords: session.passiveRecords,
			},
		),
		registries: scaffold.registries,
	};
}

describe('modifier percent formatting', () => {
	it('describes rounded percent bonuses and penalties', () => {
		const { context: bonusCtx, registries } = createContext();
		const [firstDevelopmentId] = registries.developments.keys();
		const developmentId = firstDevelopmentId ?? 'farm';
		const bonus: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:income',
				evaluation: { type: 'development', id: developmentId },
				percent: 0.2,
			},
			round: 'up',
		};
		const bonusSummary = summarizeEffects([bonus], bonusCtx);
		const developmentInfo = registries.developments.get(developmentId);
		const developmentToken =
			developmentInfo?.icon ?? developmentInfo?.name ?? developmentId;
		expect(bonusSummary).toEqual([expect.stringContaining(developmentToken)]);
		expect(bonusSummary[0]).toContain('gain 20% more');
		expect(bonusSummary[0]).toContain('rounded up');
		const bonusDescription = describeEffects([bonus], bonusCtx);
		expect(bonusDescription[0]).toContain(developmentToken);
		expect(bonusDescription[0]).toContain(
			'20% more of that resource (rounded up)',
		);

		const { context: penaltyCtx } = createContext();
		const penalty: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:income:penalty',
				evaluation: { type: 'development', id: developmentId },
				percent: -0.25,
			},
			round: 'down',
		};
		const penaltySummary = summarizeEffects([penalty], penaltyCtx);
		expect(penaltySummary[0]).toContain('gain 25% less');
		expect(penaltySummary[0]).toContain('rounded down');
		const penaltyDescription = describeEffects([penalty], penaltyCtx);
		expect(penaltyDescription[0]).toContain(
			'25% less of that resource (rounded down)',
		);
	});

	it('falls back to raw numbers when percent metadata is missing', () => {
		const { context } = createContext();
		const fallbackDisplay = selectStatDisplay(context.assets, 'unknown-stat');
		expect(fallbackDisplay.label).toBe('unknown-stat');
		const fallbackValue = formatStatValue('unknown-stat', 0.5, context.assets);
		expect(fallbackValue).toBe('0.5');
	});
});
