import { describe, it, expect } from 'vitest';
import { PHASES } from '@kingdom-builder/contents';
import type { PhaseDef } from '../../src/phases.ts';
import { createTestEngine } from '../helpers.ts';

const PHASE_DEFINITION_REQUIRED_MESSAGE =
	'Test requires at least one phase definition.';

describe('createEngine validation', () => {
	it('throws when phases array is empty', () => {
		const emptyPhases: PhaseDef[] = [];
		const createEngineWithoutPhases = () =>
			createTestEngine({ phases: emptyPhases });
		const expectedMessage = [
			'Cannot create engine: expected at least one phase ',
			'with steps, but received none.',
		].join('');
		expect(createEngineWithoutPhases).toThrowError(expectedMessage);
	});

	it('throws when a phase is missing steps', () => {
		const [firstPhase] = PHASES;
		if (!firstPhase) {
			throw new Error(PHASE_DEFINITION_REQUIRED_MESSAGE);
		}
		const invalidPhases = PHASES.map((phase) => {
			if (phase.id === firstPhase.id) {
				return { ...phase, steps: [] };
			}
			return phase;
		});
		const createEngineWithInvalidPhase = () =>
			createTestEngine({ phases: invalidPhases });
		const expectedMessage = [
			'Cannot create engine: phase "',
			firstPhase.id,
			'" must define at least one step.',
		].join('');
		expect(createEngineWithInvalidPhase).toThrowError(expectedMessage);
	});

	it('throws when a phase omits the steps property', () => {
		const [firstPhase] = PHASES;
		if (!firstPhase) {
			throw new Error(PHASE_DEFINITION_REQUIRED_MESSAGE);
		}
		const invalidPhases = PHASES.map((phase) => {
			if (phase.id !== firstPhase.id) {
				return phase;
			}
			const missingStepsPhase = {
				...phase,
				steps: undefined,
			} as unknown as PhaseDef;
			return missingStepsPhase;
		});
		const createEngineWithMissingStepsProperty = () =>
			createTestEngine({ phases: invalidPhases });
		const expectedMessage = [
			'Cannot create engine: phase "',
			firstPhase.id,
			'" must define at least one step.',
		].join('');
		expect(createEngineWithMissingStepsProperty).toThrowError(expectedMessage);
	});
});
