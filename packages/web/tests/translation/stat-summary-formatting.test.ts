import { describe, expect, it } from 'vitest';
import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	SessionMetadataDescriptor,
	SessionPlayerId,
} from '@kingdom-builder/protocol/session';
import { summarizeEffects } from '../../src/translation/effects';
import { createTranslationContext } from '../../src/translation/context';
import { selectStatDescriptor } from '../../src/translation/effects/registrySelectors';
import { createTestSessionScaffold } from '../helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';

interface StatKeyMap {
	armyStrength: string;
	fortificationStrength: string;
	maxPopulation: string;
	absorption: string;
	warWeariness: string;
}

function findStatKey(
	stats: Record<string, SessionMetadataDescriptor> | undefined,
	predicate: (descriptor: SessionMetadataDescriptor) => boolean,
): string {
	if (!stats) {
		throw new Error('Expected stats metadata to be defined');
	}
	for (const [key, descriptor] of Object.entries(stats)) {
		if (predicate(descriptor)) {
			return key;
		}
	}
	throw new Error('Unable to resolve stat key from metadata');
}

function createContext() {
	const scaffold = createTestSessionScaffold();
	const metadata = {
		...scaffold.metadata,
		stats: {
			...scaffold.metadata.stats,
			warWeariness: {
				icon: '💤',
				label: 'War Weariness',
				description: 'Represents exhaustion from prolonged conflict.',
			},
		},
	};
	const stats = metadata.stats;
	const statKeys: StatKeyMap = {
		armyStrength: findStatKey(
			stats,
			(descriptor) => descriptor.label === 'Army Might',
		),
		fortificationStrength: findStatKey(
			stats,
			(descriptor) => descriptor.label === 'Fortress Resilience',
		),
		maxPopulation: findStatKey(
			stats,
			(descriptor) => descriptor.label === 'Maximum Population',
		),
		absorption: findStatKey(
			stats,
			(descriptor) => descriptor.label === 'Damage Absorption',
		),
		warWeariness: findStatKey(
			stats,
			(descriptor) => descriptor.label === 'War Weariness',
		),
	};
	const active = createSnapshotPlayer({
		id: 'A' as SessionPlayerId,
	});
	const opponent = createSnapshotPlayer({
		id: 'B' as SessionPlayerId,
	});
	const session = createSessionSnapshot({
		players: [active, opponent],
		activePlayerId: active.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});
	const context = createTranslationContext(
		session,
		scaffold.registries,
		session.metadata,
		{
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		},
	);
	return { context, statKeys };
}

describe('stat summarize formatting', () => {
	it('renders stat summaries with icons and labels for key action panel stats', () => {
		const { context, statKeys } = createContext();
		const effects: EffectDef[] = [
			{
				type: 'stat',
				method: 'add',
				params: { key: statKeys.armyStrength, amount: 1 },
			},
			{
				type: 'stat',
				method: 'add',
				params: { key: statKeys.fortificationStrength, amount: 2 },
			},
			{
				type: 'stat',
				method: 'add',
				params: { key: statKeys.maxPopulation, amount: 1 },
			},
			{
				type: 'stat',
				method: 'add',
				params: { key: statKeys.absorption, amount: 0.2 },
			},
			{
				type: 'stat',
				method: 'add',
				params: { key: statKeys.warWeariness, amount: 1 },
			},
		];
		const summaries = summarizeEffects(effects, context);
		effects.forEach((effect, index) => {
			const statKey = effect.params?.['key'] as string;
			const descriptor = selectStatDescriptor(context, statKey);
			const summary = summaries[index];
			expect(typeof summary).toBe('string');
			if (typeof summary !== 'string') {
				throw new Error('Expected summary entry to be string');
			}
			expect(summary).toContain(descriptor.label ?? statKey);
			if (descriptor.icon) {
				expect(summary).toContain(descriptor.icon);
			}
			expect(summary).not.toContain(statKey);
			if (statKey === statKeys.absorption) {
				expect(summary).toMatch(/ \+[0-9]+%/);
			} else {
				expect(summary).toMatch(/ [+-][0-9]+/);
			}
		});
	});
});
