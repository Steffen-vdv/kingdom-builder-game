import { describe, it, expect } from 'vitest';
import { PHASES } from '@kingdom-builder/contents';
import type { PhaseDef } from '../../src/phases.ts';
import { createTestEngine } from '../helpers.ts';

describe('createEngine validation', () => {
	it('throws when phases array is empty', () => {
		const emptyPhases: PhaseDef[] = [];
		const createEngineWithoutPhases = () =>
			createTestEngine({ phases: emptyPhases });
		expect(createEngineWithoutPhases).toThrowError(
			'Cannot create engine: expected at least one phase with ' +
				'steps, but received none.',
		);
	});

	it('throws when a phase is missing steps', () => {
		const [firstPhase] = PHASES;
		if (!firstPhase) {
			throw new Error('Test requires at least one phase definition.');
		}
		const invalidPhases = PHASES.map((phase) =>
			phase.id === firstPhase.id ? { ...phase, steps: [] } : phase,
		);
		const createEngineWithInvalidPhase = () =>
			createTestEngine({ phases: invalidPhases });
		expect(createEngineWithInvalidPhase).toThrowError(
			'Cannot create engine: phase "' +
				firstPhase.id +
				'" must define at least one step.',
		);
	});
});
