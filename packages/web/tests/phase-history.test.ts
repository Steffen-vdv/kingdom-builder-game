import { describe, it, expect, vi } from 'vitest';
import { isActionPhaseActive } from '../src/utils/isActionPhaseActive';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

// Ensure actions remain enabled when viewing previous phase history.
// Specifically, the check should depend solely on the provided phase ids.

describe('isActionPhaseActive', () => {
	const phaseA = 'phaseA';
	const phaseB = 'phaseB';

	it('returns true when game is in action phase regardless of display phase', () => {
		expect(isActionPhaseActive(phaseA, phaseA, true)).toBe(true);
	});

	it('returns false when not in action phase', () => {
		expect(isActionPhaseActive(phaseB, phaseA, true)).toBe(false);
	});
});
