import { describe, expect, it } from 'vitest';
import {
	buildRuntimeConfigFallback,
	type RuntimeConfigFallback,
} from '../../../scripts/runtimeConfigFallback';
import fallbackSnapshot from '../src/startup/runtimeConfigFallback.json';

describe('runtimeConfigFallback snapshot', () => {
	it('stays in sync with the generator output', () => {
		const regenerated = buildRuntimeConfigFallback();
		const snapshot = fallbackSnapshot as RuntimeConfigFallback;
		expect(regenerated).toEqual(snapshot);
	});
});
