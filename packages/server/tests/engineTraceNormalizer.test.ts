import { describe, it, expect } from 'vitest';
import { normalizeActionTraces } from '../src/transport/engineTraceNormalizer.js';
import type {
	ActionTrace as EngineActionTrace,
	PlayerSnapshot as EnginePlayerSnapshot,
	PassiveSummary as EnginePassiveSummary,
} from '@kingdom-builder/engine';

describe('engineTraceNormalizer', () => {
	it('deeply clones player snapshots when normalizing traces', () => {
		const before: EnginePlayerSnapshot = {
			valuesV2: { 'resource:core:gold': 5, 'resource:stat:strength': 2 },
			buildings: ['tower'],
			lands: [
				{
					id: 'land-1',
					slotsMax: 2,
					slotsUsed: 1,
					developments: ['farm'],
				},
			],
			passives: [
				createPassive({
					id: 'passive:1',
					name: 'Guardian Aura',
					icon: 'shield',
					detail: 'Reduces damage.',
					meta: {
						source: { type: 'building', id: 'tower', name: 'Tower' },
					},
				}),
			],
		};
		const after: EnginePlayerSnapshot = {
			valuesV2: { 'resource:core:gold': 7, 'resource:stat:strength': 3 },
			buildings: ['tower', 'barracks'],
			lands: [
				{
					id: 'land-1',
					slotsMax: 2,
					slotsUsed: 2,
					developments: ['farm', 'forge'],
				},
			],
			passives: [createPassive({ id: 'passive:2' })],
		};
		const traces = normalizeActionTraces([
			{
				id: 'trace-1',
				before,
				after,
			} satisfies EngineActionTrace,
		]);
		const [normalized] = traces;
		expect(normalized.before).not.toBe(before);
		expect(normalized.after).not.toBe(after);
		// Normalizer copies valuesV2 instead of legacy resources
		expect(normalized.before.valuesV2).toEqual(before.valuesV2);
		expect(normalized.after.buildings).toEqual(after.buildings);
		expect(normalized.before.lands[0]).not.toBe(before.lands[0]);
		expect(normalized.before.passives[0]?.meta).not.toBe(
			before.passives[0]?.meta,
		);
		expect(normalized.before.passives[0]).toEqual({
			id: 'passive:1',
			name: 'Guardian Aura',
			icon: 'shield',
			detail: 'Reduces damage.',
			meta: {
				source: { type: 'building', id: 'tower', name: 'Tower' },
			},
		});
		expect(normalized.after.passives[0]).toEqual({ id: 'passive:2' });
	});
});

function createPassive(partial: EnginePassiveSummary): EnginePassiveSummary {
	return { ...partial };
}
