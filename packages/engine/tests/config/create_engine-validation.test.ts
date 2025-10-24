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

	it('throws when a phase includes a step without an id', () => {
		const [firstPhase] = PHASES;
		if (!firstPhase) {
			throw new Error('Test requires at least one phase definition.');
		}
		const invalidPhases = PHASES.map((phase) => {
			const steps = phase.steps.map((step, index) => {
				if (phase.id === firstPhase.id && index === 0) {
					return { ...step, id: '' };
				}
				return { ...step };
			});
			return { ...phase, steps } satisfies PhaseDef;
		});
		const createEngineWithInvalidStep = () =>
			createTestEngine({ phases: invalidPhases });
		expect(createEngineWithInvalidStep).toThrowError(
			'Cannot create engine: phase "' +
				firstPhase.id +
				'" includes a step without an id.',
		);
	});

	it('throws when the phases array includes an undefined entry', () => {
		const invalidPhases = [undefined, ...PHASES] as unknown as PhaseDef[];
		const createEngineWithUndefinedPhase = () =>
			createTestEngine({ phases: invalidPhases });
		expect(createEngineWithUndefinedPhase).toThrowError(
			'Cannot create engine: phases array contains an undefined entry.',
		);
	});

	it('throws when a phase includes an undefined step entry', () => {
		const [firstPhase] = PHASES;
		if (!firstPhase) {
			throw new Error('Test requires at least one phase definition.');
		}
		const invalidPhases = PHASES.map((phase) => {
			if (phase.id !== firstPhase.id) {
				return phase;
			}
			return {
				...phase,
				steps: [undefined, ...phase.steps] as unknown as PhaseDef['steps'],
			};
		});
		const createEngineWithUndefinedStep = () =>
			createTestEngine({ phases: invalidPhases });
		expect(createEngineWithUndefinedStep).toThrowError(
			'Cannot create engine: phase "' +
				firstPhase.id +
				'" includes an undefined step.',
		);
	});
});
