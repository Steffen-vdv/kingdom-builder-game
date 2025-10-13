import { describe, it, expect } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { summarizeContent } from '../src/translation/content';
import type { EffectDef, PlayerId } from '@kingdom-builder/engine';
import {
	createTranslationContext,
	selectSlotDisplay,
} from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

function createContext(
	customizeMetadata?: (
		metadata: ReturnType<typeof createTestSessionScaffold>['metadata'],
	) => void,
) {
	const scaffold = createTestSessionScaffold();
	const metadata = structuredClone(scaffold.metadata);
	customizeMetadata?.(metadata);
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
		metadata,
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
		const summary = summarizeEffects(
			[{ type: 'land', method: 'till' } as EffectDef],
			context,
		);
		const expectedIcon = slotDisplay.icon ?? '';
		if (expectedIcon) {
			expect(summary).toContain(`${expectedIcon}+1`);
		} else {
			expect(summary).toContain('+1');
		}
	});

	it('honors metadata overrides when adding land', () => {
		const landIcon = '🏝️';
		const landLabel = 'Archipelago';
		const { context } = createContext((metadata) => {
			metadata.assets = {
				...metadata.assets,
				land: { icon: landIcon, label: landLabel },
			};
		});
		const effect: EffectDef = {
			type: 'land',
			method: 'add',
			params: { count: 2 },
		};
		const summary = summarizeEffects([effect], context);
		expect(summary).toContain(`${landIcon}+2`);
		const description = describeEffects([effect], context);
		expect(description).toContain(`${landIcon} +2 ${landLabel}`);
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
		const slotToken = slotDisplay.icon ?? slotDisplay.label ?? '';
		const hasSlotToken = summary.some(
			(item) => typeof item === 'string' && item.includes(slotToken),
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
