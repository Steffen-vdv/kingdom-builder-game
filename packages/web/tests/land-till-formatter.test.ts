import { describe, it, expect } from 'vitest';
import { summarizeEffects } from '../src/translation/effects';
import { summarizeContent } from '../src/translation/content';
import type { EffectDef, SessionPlayerId } from '@kingdom-builder/protocol';
import {
	createTranslationContext,
	selectSlotDisplay,
} from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

function createContext() {
	const scaffold = createTestSessionScaffold();
	const activePlayer = createSnapshotPlayer({
		id: 'player:active' as SessionPlayerId,
	});
	const opponent = createSnapshotPlayer({
		id: 'player:opponent' as SessionPlayerId,
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

describe('land till formatter', () => {
	it('summarizes till effect', () => {
		const { context } = createContext();
		const slotDisplay = selectSlotDisplay(context.assets);
		const slotIcon = slotDisplay.icon ?? '🧩';
		const summary = summarizeEffects(
			[{ type: 'land', method: 'till' } as EffectDef],
			context,
		);
		expect(summary).toContain(`${slotIcon}+1`);
	});

	it('summarizes till action', () => {
		const { context, registries } = createContext();
		const slotDisplay = selectSlotDisplay(context.assets);
		const tillId = Array.from(registries.actions.keys()).find((actionId) => {
			const action = registries.actions.get(actionId);
			return action.effects?.some(
				(effect) => effect.type === 'land' && effect.method === 'till',
			);
		});
		expect(tillId).toBeDefined();
		if (!tillId) {
			return;
		}
		const summary = summarizeContent('action', tillId, context);
		const slotIcon = slotDisplay.icon ?? '🧩';
		const slotLabel = slotDisplay.label ?? 'Development Slot';
		const hasSlotToken = summary.some(
			(item) =>
				typeof item === 'string' &&
				(item.includes(slotIcon) || item.includes(slotLabel)),
		);
		expect(hasSlotToken).toBe(true);
	});

	it('omits output when the land method is unknown', () => {
		const { context } = createContext();
		const summary = summarizeEffects(
			[{ type: 'land', method: 'cultivate' } as EffectDef],
			context,
		);
		expect(summary).toEqual([]);
	});
});
