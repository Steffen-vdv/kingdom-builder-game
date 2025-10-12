import { describe, it, expect } from 'vitest';
import { PHASES } from '@kingdom-builder/contents';
import { createTestEngine } from '../helpers.ts';

describe('createEngine validation', () => {
	it('throws when phases are empty', () => {
		expect(() => createTestEngine({ phases: [] })).toThrowError(
			'Engine configuration requires at least one phase with steps.',
		);
	});

	it('throws when a phase has no steps', () => {
		const phases = PHASES.map((phase) => ({
			...phase,
			steps: [...phase.steps],
		}));
		const phaseId = phases[0]!.id;
		phases[0] = {
			...phases[0]!,
			steps: [],
		};
		expect(() => createTestEngine({ phases })).toThrowError(
			`Phase "${phaseId}" is missing required steps.`,
		);
	});

	it('throws when a phase step is missing an id', () => {
		const phases = PHASES.map((phase) => ({
			...phase,
			steps: phase.steps.map((step) => ({ ...step })),
		}));
		const phase = phases[0]!;
		const phaseId = phase.id;
		const steps = [...phase.steps];
		steps[0] = {
			...steps[0]!,
			id: '',
		};
		phases[0] = {
			...phase,
			steps,
		};
		expect(() => createTestEngine({ phases })).toThrowError(
			`Phase "${phaseId}" contains a step without an id at index 0.`,
		);
	});
});
