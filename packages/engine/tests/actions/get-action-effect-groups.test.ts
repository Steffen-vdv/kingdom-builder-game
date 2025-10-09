import { describe, it, expect } from 'vitest';
import { getActionEffectGroups } from '../../src';
import type { EngineContext } from '../../src/context';

describe('getActionEffectGroups', () => {
	it('throws when the action is missing from the registry', () => {
		const engineContext = {
			actions: {
				get: () => undefined,
			},
		} as Partial<EngineContext>;
		const missingActionId = 'missing-action';

		expect(() =>
			getActionEffectGroups(missingActionId, engineContext as EngineContext),
		).toThrow(`Unknown action "${missingActionId}"`);
	});
});
