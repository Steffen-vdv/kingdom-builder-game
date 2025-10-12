import { describe, it, expect, vi } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { summarizeContent } from '../src/translation/content';
import type { PlayerId } from '@kingdom-builder/engine';
import { selectSlotDisplay } from '../src/translation/context/assetSelectors';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSnapshotPlayer,
	createSessionSnapshot,
} from './helpers/sessionFixtures';
import { createTranslationContext } from '../src/translation/context';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createLandTranslationContext() {
	const scaffold = createTestSessionScaffold();
	const metadata = structuredClone(scaffold.metadata);
	const players = [
		createSnapshotPlayer({ id: 'A' as PlayerId }),
		createSnapshotPlayer({ id: 'B' as PlayerId }),
	];
	const session = createSessionSnapshot({
		players,
		activePlayerId: players[0].id,
		opponentId: players[1].id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});
	const context = createTranslationContext(
		session,
		scaffold.registries,
		metadata,
		{
			ruleSnapshot: scaffold.ruleSnapshot,
			passiveRecords: session.passiveRecords,
		},
	);
	return { context, registries: scaffold.registries };
}

describe('land till formatter', () => {
	it('summarizes till effect', () => {
		const { context } = createLandTranslationContext();
		const slotIcon = selectSlotDisplay(context.assets).icon ?? '';
		const summary = summarizeEffects(
			[{ type: 'land', method: 'till' }],
			context,
		);
		expect(summary).toContain(`${slotIcon}+1`);
	});

	it('summarizes till action', () => {
		const { context, registries } = createLandTranslationContext();
		const slotIcon = selectSlotDisplay(context.assets).icon ?? '';
		const tillId = Array.from(registries.actions.keys()).find((actionId) => {
			const definition = registries.actions.get(actionId);
			return definition.effects.some(
				(effect) => effect.type === 'land' && effect.method === 'till',
			);
		});
		expect(tillId).toBeDefined();
		if (!tillId) {
			throw new Error('Expected to locate a till action in test registries.');
		}
		const summary = summarizeContent('action', tillId, context);
		const hasIcon = summary.some(
			(item) => typeof item === 'string' && item.includes(slotIcon),
		);
		expect(hasIcon).toBe(true);
	});

	it('omits summaries for unregistered land methods', () => {
		const { context } = createLandTranslationContext();
		const summary = summarizeEffects(
			[{ type: 'land', method: 'cultivate' as LandMethods }],
			context,
		);
		const description = describeEffects(
			[{ type: 'land', method: 'cultivate' as LandMethods }],
			context,
		);
		expect(summary).toHaveLength(0);
		expect(description).toHaveLength(0);
	});
});
