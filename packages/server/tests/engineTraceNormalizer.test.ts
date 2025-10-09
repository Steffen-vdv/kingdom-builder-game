import { describe, it, expect } from 'vitest';
import type { ActionTrace as EngineActionTrace } from '@kingdom-builder/engine';
import { normalizeActionTraces } from '../src/transport/engineTraceNormalizer.js';

describe('engineTraceNormalizer', () => {
	it('clones nested trace data and omits undefined passive fields', () => {
		const trace: EngineActionTrace = {
			id: 'trace:1',
			before: {
				resources: { gold: 3 },
				stats: { defense: 1 },
				buildings: ['building:foundry'],
				lands: [
					{
						id: 'land:1',
						slotsMax: 2,
						slotsUsed: 1,
						developments: ['development:farm'],
					},
				],
				passives: [
					{
						id: 'passive:one',
						name: 'First Passive',
						icon: 'icon:first',
						detail: 'detail:first',
						meta: {
							source: {
								type: 'building',
								id: 'building:hall',
								name: 'Hall',
							},
							removal: { token: 'remove:token' },
						},
					},
					{ id: 'passive:two' },
				],
			},
			after: {
				resources: { gold: 5 },
				stats: { defense: 2 },
				buildings: ['building:foundry'],
				lands: [
					{
						id: 'land:1',
						slotsMax: 2,
						slotsUsed: 1,
						developments: ['development:farm'],
					},
				],
				passives: [
					{
						id: 'passive:one',
						meta: {
							source: { type: 'building', id: 'building:hall' },
						},
					},
				],
			},
		};
		const normalized = normalizeActionTraces([trace]);
		const [entry] = normalized;
		expect(entry.before.resources).toEqual(trace.before.resources);
		expect(entry.before.resources).not.toBe(trace.before.resources);
		expect(entry.before.lands[0]?.developments).toEqual(['development:farm']);
		expect(entry.before.lands[0]?.developments).not.toBe(
			trace.before.lands[0]?.developments,
		);
		expect(entry.before.passives[0]?.meta?.source?.name).toBe('Hall');
		expect(entry.before.passives[1]).toEqual({ id: 'passive:two' });
		trace.before.resources.gold = 11;
		trace.before.lands[0]?.developments.push('development:mills');
		const passiveSource = trace.before.passives[0]?.meta?.source;
		if (passiveSource) {
			passiveSource.name = 'Changed';
		}
		expect(entry.before.resources.gold).toBe(3);
		expect(entry.before.lands[0]?.developments).toEqual(['development:farm']);
		expect(entry.before.passives[0]?.meta?.source?.name).toBe('Hall');
		expect(entry.after).not.toBe(trace.after);
	});
});
