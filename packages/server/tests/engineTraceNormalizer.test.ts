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
			values: {
				'resource:alpha': {
					amount: 4,
					touched: true,
					recentGains: [{ resourceId: 'resource:alpha', delta: 2 }],
					tier: { tierId: 'tier:1' },
					parent: {
						id: 'resource:parent',
						amount: 9,
						touched: true,
						bounds: { upperBound: 20 },
					},
				},
				'resource:parent': {
					amount: 9,
					touched: true,
					recentGains: [],
				},
			},
			resources: { gold: 5 },
			stats: { strength: 2 },
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
			values: {
				'resource:alpha': {
					amount: 7,
					touched: true,
					recentGains: [{ resourceId: 'resource:alpha', delta: 3 }],
					parent: {
						id: 'resource:parent',
						amount: 12,
						touched: true,
					},
				},
				'resource:parent': {
					amount: 12,
					touched: true,
					recentGains: [],
				},
			},
			resources: { gold: 7 },
			stats: { strength: 3 },
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
		expect(normalized.before.resources).toEqual(before.resources);
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
		expect(normalized.before.values).not.toBe(before.values);
		expect(normalized.before.values).toEqual(before.values);
		expect(normalized.after.values).toEqual(after.values);
		expect(normalized.after.values?.['resource:alpha']?.recentGains).not.toBe(
			after.values?.['resource:alpha']?.recentGains,
		);
	});
});

function createPassive(partial: EnginePassiveSummary): EnginePassiveSummary {
	return { ...partial };
}
