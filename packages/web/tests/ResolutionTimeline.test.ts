import { describe, expect, it } from 'vitest';
import {
	buildTimelineTree,
	collectCostEntries,
	collectEffectEntries,
} from '../src/components/ResolutionTimeline';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';

describe('ResolutionTimeline helpers', () => {
	it('collects cost entries regardless of depth', () => {
		const descriptors: ActionLogLineDescriptor[] = [
			{ text: '🏗️ Develop', depth: 0, kind: 'headline' },
			{ text: '💲 Action cost', depth: 1, kind: 'cost' },
			{ text: 'Spend 3 Gold', depth: 2, kind: 'cost-detail' },
			{ text: '✨ Result effect', depth: 1, kind: 'effect' },
		];
		const tree = buildTimelineTree(descriptors);
		const costEntries = collectCostEntries(tree);
		const effectEntries = collectEffectEntries(tree);

		expect(
			costEntries.map((entry) => ({
				text: entry.text,
				level: entry.level,
			})),
		).toEqual([
			{ text: '💲 Action cost', level: 0 },
			{ text: 'Spend 3 Gold', level: 1 },
		]);
		expect(effectEntries.map((entry) => entry.text)).toEqual([
			'🏗️ Develop',
			'✨ Result effect',
		]);
	});

	it('handles missing timeline descriptors', () => {
		// @ts-expect-error intentionally passing undefined to verify guard behaviour
		const tree = buildTimelineTree(undefined);
		expect(tree).toEqual([]);
	});
});
