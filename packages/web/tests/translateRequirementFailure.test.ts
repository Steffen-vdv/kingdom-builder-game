import { describe, expect, it } from 'vitest';
import { translateRequirementFailure } from '../src/translation';
import type { EngineContext } from '@kingdom-builder/engine';

type RequirementFailure = Parameters<typeof translateRequirementFailure>[0];
import { PopulationRole, Stat } from '@kingdom-builder/contents';

describe('translateRequirementFailure', () => {
	const ctx = {} as EngineContext;

	it('describes population capacity failures with current and max values', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: { type: 'population' },
					right: { type: 'stat', params: { key: Stat.maxPopulation } },
					operator: 'lt',
				},
			},
			details: { left: 3, right: 3 },
		};
		const message = translateRequirementFailure(failure, ctx);
		expect(message).toBe('👥 Population is at capacity (3/3)');
	});

	it('formats stat versus population comparisons with icons and values', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: { type: 'stat', params: { key: Stat.warWeariness } },
					right: {
						type: 'population',
						params: { role: PopulationRole.Legion },
					},
					operator: 'lt',
				},
			},
			details: { left: 2, right: 1 },
		};
		const message = translateRequirementFailure(failure, ctx);
		expect(message).toBe(
			'💤 War Weariness (2) must be lower than 🎖️ Legion (1)',
		);
	});

	it('returns a generic message for unknown requirement types', () => {
		const failure: RequirementFailure = {
			requirement: { type: 'custom', method: 'test' },
			details: { message: 'Requires special condition' },
		};
		const message = translateRequirementFailure(failure, ctx);
		expect(message).toBe('Requirement not met');
	});

	it('ignores legacy requirement message fields to keep messaging in web', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'custom',
				method: 'legacy',
				message: 'Legacy text',
			} as unknown as RequirementFailure['requirement'],
		};
		const message = translateRequirementFailure(failure, ctx);
		expect(message).toBe('Requirement not met');
	});
});
