import { describe, expect, it } from 'vitest';
import { translateRequirementFailure } from '../src/translation';
import type { TranslationContext } from '../src/translation/context';
import {
	createTranslationContextStub,
	toTranslationPlayer,
} from './helpers/translationContextStub';

type RequirementFailure = Parameters<typeof translateRequirementFailure>[0];

const translationAssets: TranslationContext['assets'] = Object.freeze({
	resources: Object.freeze({}),
	stats: Object.freeze({
		maxPopulation: Object.freeze({ icon: '👥', label: 'Max Population' }),
		warWeariness: Object.freeze({ icon: '💤', label: 'War Weariness' }),
	}),
	populations: Object.freeze({
		legion: Object.freeze({ icon: '🎖️', label: 'Legion' }),
	}),
	population: Object.freeze({ icon: '👥', label: 'Population' }),
	land: Object.freeze({}),
	slot: Object.freeze({}),
	passive: Object.freeze({}),
	modifiers: Object.freeze({}),
	triggers: Object.freeze({}),
	misc: Object.freeze({}),
	tierSummaries: Object.freeze(new Map<string, string>()),
	formatPassiveRemoval: (description: string) =>
		`Active as long as ${description}`,
});

function createContext(): TranslationContext {
	return createTranslationContextStub({
		phases: [],
		actionCostResource: undefined,
		activePlayer: toTranslationPlayer({
			id: 'A',
			name: 'Active',
			resources: {},
			population: {},
		}),
		opponent: toTranslationPlayer({
			id: 'B',
			name: 'Opponent',
			resources: {},
			population: {},
		}),
		assets: translationAssets,
	});
}

describe('translateRequirementFailure', () => {
	const ctx = createContext();

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
		const message = translateRequirementFailure(failure, ctx);
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

	it('falls back to the failure message when translation is unavailable', () => {
		const failure: RequirementFailure = {
			requirement: { type: 'custom', method: 'fallback' },
			message: 'Custom fallback text',
		};
		const message = translateRequirementFailure(failure, ctx);
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
		const message = translateRequirementFailure(failure, ctx);
		expect(message).toBe('Requirement not met');
	});
});
