import { beforeEach, describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { hydrateResourceV2Metadata } from '../src/resourcesV2/index.ts';
import {
	PlayerState,
	cloneResourceV2State,
	setResourceV2Keys,
	type PlayerResourceV2State,
} from '../src/state/index.ts';

interface BootstrapResult {
	catalog: ReturnType<typeof hydrateResourceV2Metadata>;
}

const bootstrapResourceV2 = (): BootstrapResult => {
	const content = createContentFactory();
	const catalog = hydrateResourceV2Metadata(
		content.resourcesV2,
		content.resourceGroups,
	);
	setResourceV2Keys(catalog);
	return { catalog };
};

const ensureResourceId = (ids: string[]): string => {
	const [first] = ids;
	if (!first) {
		throw new Error(
			'Expected runtime catalog to provide at least one resource id',
		);
	}
	return first;
};

const resetResourceV2Registry = () => {
	setResourceV2Keys();
};

describe('PlayerState ResourceV2 integration', () => {
	beforeEach(resetResourceV2Registry);

	it('initializes ResourceV2 maps from runtime catalog metadata', () => {
		const { catalog } = bootstrapResourceV2();
		const player = new PlayerState('A', 'Tester');

		for (const id of catalog.orderedResourceIds) {
			const runtime = catalog.resourcesById[id];
			expect(runtime).toBeDefined();
			const lower = runtime?.lowerBound;
			const upper = runtime?.upperBound;
			expect(player.resourceV2.values[id]).toBe(0);
			expect(player.resourceV2.touched[id]).toBe(false);
			expect(player.resourceV2.lowerBounds[id]).toBe(lower);
			expect(player.resourceV2.upperBounds[id]).toBe(upper);
		}
	});

	it('marks ResourceV2 entries as touched after value changes', () => {
		const { catalog } = bootstrapResourceV2();
		const key = ensureResourceId(catalog.orderedResourceIds);
		const player = new PlayerState('A', 'Tester');

		expect(player.hasResourceV2BeenTouched(key)).toBe(false);

		player.setResourceV2Value(key, player.getResourceV2Value(key));
		expect(player.hasResourceV2BeenTouched(key)).toBe(false);

		player.setResourceV2Value(key, 7);
		expect(player.getResourceV2Value(key)).toBe(7);
		expect(player.hasResourceV2BeenTouched(key)).toBe(true);

		player.setResourceV2Value(key, 7);
		expect(player.hasResourceV2BeenTouched(key)).toBe(true);

		player.setResourceV2Value(key, 0);
		expect(player.getResourceV2Value(key)).toBe(0);
		expect(player.hasResourceV2BeenTouched(key)).toBe(true);
	});

	it('clones ResourceV2 state maps to keep references isolated', () => {
		const { catalog } = bootstrapResourceV2();
		const key = ensureResourceId(catalog.orderedResourceIds);
		const player = new PlayerState('A', 'Tester');

		player.setResourceV2Value(key, 5);
		player.setResourceV2LowerBound(key, 1);
		player.setResourceV2UpperBound(key, 12);
		const clone: PlayerResourceV2State = cloneResourceV2State(
			player.resourceV2,
		);
		clone.values[key] = 99;
		clone.lowerBounds[key] = 0;
		clone.upperBounds[key] = 20;
		clone.touched[key] = false;

		expect(player.getResourceV2Value(key)).toBe(5);
		expect(player.getResourceV2LowerBound(key)).toBe(1);
		expect(player.getResourceV2UpperBound(key)).toBe(12);
		expect(player.hasResourceV2BeenTouched(key)).toBe(true);
	});
});
