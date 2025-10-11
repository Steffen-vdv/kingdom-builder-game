import { describe, expect, it } from 'vitest';
import { translateRequirementFailure } from '../src/translation';
import type { TranslationContext } from '../src/translation/context';

type RequirementFailure = Parameters<typeof translateRequirementFailure>[0];

describe('translateRequirementFailure', () => {
	const context = {
		assets: {
			resources: {},
			stats: {
				maxPopulation: { icon: '👥', label: 'Max Population' },
				warWeariness: { icon: '💤', label: 'War Weariness' },
			},
			populations: {
				legion: { icon: '🎖️', label: 'Legion' },
			},
			population: { icon: '👥', label: 'Population' },
			land: { icon: '🗺️', label: 'Land' },
			slot: { icon: '🧩', label: 'Development Slot' },
			passive: { icon: '♾️', label: 'Passive' },
			upkeep: { icon: '🧹', label: 'Upkeep' },
			modifiers: {},
			triggers: {},
			tierSummaries: {},
			formatPassiveRemoval: (text: string) => text,
		},
	} as unknown as TranslationContext;

	it('describes population capacity failures with current and max values', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: { type: 'population' },
					right: { type: 'stat', params: { key: 'maxPopulation' } },
					operator: 'lt',
				},
			},
			details: { left: 3, right: 3 },
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe('👥 Population is at capacity (3/3)');
	});

	it('formats stat versus population comparisons with icons and values', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'evaluator',
				method: 'compare',
				params: {
					left: { type: 'stat', params: { key: 'warWeariness' } },
					right: {
						type: 'population',
						params: { role: 'legion' },
					},
					operator: 'lt',
				},
			},
			details: { left: 2, right: 1 },
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe(
			'💤 War Weariness (2) must be lower than 🎖️ Legion (1)',
		);
	});

	it('returns a generic message for unknown requirement types', () => {
		const failure: RequirementFailure = {
			requirement: { type: 'custom', method: 'test' },
			details: { message: 'Requires special condition' },
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe('Requirement not met');
	});

	it('falls back to the failure message when translation is unavailable', () => {
		const failure: RequirementFailure = {
			requirement: { type: 'custom', method: 'fallback' },
			message: 'Custom fallback text',
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe('Custom fallback text');
	});

	it('ignores legacy requirement message fields to keep messaging in web', () => {
		const failure: RequirementFailure = {
			requirement: {
				type: 'custom',
				method: 'legacy',
				message: 'Legacy text',
			} as unknown as RequirementFailure['requirement'],
		};
		const message = translateRequirementFailure(failure, context);
		expect(message).toBe('Requirement not met');
	});
});
