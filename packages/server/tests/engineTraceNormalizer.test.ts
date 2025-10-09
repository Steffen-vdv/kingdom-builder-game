import { describe, it, expect } from 'vitest';
import type {
	ActionTrace,
	PlayerSnapshot,
	PassiveSummary,
} from '@kingdom-builder/engine';
import { normalizeActionTraces } from '../src/transport/engineTraceNormalizer.js';

describe('engineTraceNormalizer', () => {
	it('clones engine snapshots into protocol structures', () => {
		const passive: PassiveSummary = {
			id: 'passive:alpha',
			name: 'Alpha',
			icon: 'alpha.svg',
			detail: 'alpha:detail',
			meta: { nested: { value: 1 } },
		};
		const before: PlayerSnapshot = {
			resources: { gold: 3 },
			stats: { power: 2 },
			buildings: ['building:keep'],
			lands: [
				{
					id: 'land:001',
					slotsMax: 2,
					slotsUsed: 1,
					developments: ['development:well'],
				},
			],
			passives: [passive],
		};
		const after: PlayerSnapshot = {
			resources: { gold: 4 },
			stats: { power: 3 },
			buildings: ['building:keep', 'building:mill'],
			lands: [
				{
					id: 'land:001',
					slotsMax: 2,
					slotsUsed: 1,
					developments: ['development:well'],
				},
			],
			passives: [passive],
		};
		const traces: ActionTrace[] = [{ id: 'trace:1', before, after }];
		const result = normalizeActionTraces(traces);
		expect(result).toHaveLength(1);
		const normalized = result[0];
		expect(normalized?.before).not.toBe(before);
		expect(normalized?.after).not.toBe(after);
		expect(normalized?.before).toEqual(before);
		expect(normalized?.after).toEqual(after);
		expect(normalized?.before.passives[0]?.meta).not.toBe(passive.meta);
		expect(normalized?.before.passives[0]?.meta).toEqual(passive.meta);
		passive.meta!.nested.value = 7;
		expect(normalized?.before.passives[0]?.meta).toEqual({
			nested: { value: 1 },
		});
	});

	it('omits undefined passive fields during normalization', () => {
		const before: PlayerSnapshot = {
			resources: {},
			stats: {},
			buildings: [],
			lands: [],
			passives: [{ id: 'passive:beta' }],
		};
		const after: PlayerSnapshot = {
			resources: {},
			stats: {},
			buildings: [],
			lands: [],
			passives: [{ id: 'passive:beta' }],
		};
		const [normalized] = normalizeActionTraces([
			{ id: 'trace:2', before, after },
		]);
		expect(normalized?.before.passives[0]).toEqual({ id: 'passive:beta' });
	});
});
