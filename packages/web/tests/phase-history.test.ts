import { describe, it, expect, vi } from 'vitest';
import { isActionPhaseActive } from '../src/utils/isActionPhaseActive';

vi.mock('../../engine/src', async () => {
	return await import('../../engine/src');
});

// Ensure actions remain enabled when viewing previous phase history.
// Specifically, the check should depend solely on the provided phase ids.

describe('isActionPhaseActive', () => {
	const phaseA = 'phaseA';
	const phaseB = 'phaseB';

	const actionPhaseState = {
		currentPhaseId: phaseA,
		isActionPhase: true,
		canEndTurn: true,
		isAdvancing: false,
	};

	const nonActionPhaseState = {
		currentPhaseId: phaseB,
		isActionPhase: false,
		canEndTurn: false,
		isAdvancing: false,
	};

	it('returns true when game is in action phase regardless of display phase', () => {
		expect(isActionPhaseActive(actionPhaseState, phaseA)).toBe(true);
	});

	it('returns false when not in action phase', () => {
		expect(isActionPhaseActive(nonActionPhaseState, phaseA)).toBe(false);
	});
});
