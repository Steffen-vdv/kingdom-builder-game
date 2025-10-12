import { describe, it, expect } from 'vitest';
import {
	summarizeContent,
	summarizeEffects,
	describeEffects,
	type Summary,
} from '../src/translation';
import { createContentFactory } from '@kingdom-builder/testing';
import { createRegistry } from './helpers/createRegistry';
import {
	wrapTranslationRegistry,
	toTranslationPlayer,
} from './helpers/translationContextStub';
import type { TranslationContext } from '../src/translation/context';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';

function createTranslationContext(): TranslationContext {
	const factory = createContentFactory();
	const population = factory.population({
		id: 'role.council',
		name: 'Council',
		icon: '👑',
	});
	const raiseAction = factory.action({
		id: 'action.raiseCouncil',
		name: 'Raise Council',
		icon: '🛡️',
		effects: [
			{
				type: 'population',
				method: 'add',
				params: { role: population.id },
			},
		],
	});
	const actions = createRegistry([raiseAction]);
	const populations = createRegistry([population]);
	const EMPTY_MODIFIERS = new Map<string, ReadonlyMap<string, unknown>>();
	const compensations: Record<string, PlayerStartConfig> = {
		'player-1': {},
		'player-2': {},
	};
	return {
		actions: wrapTranslationRegistry(actions),
		buildings: wrapTranslationRegistry(createRegistry([])),
		developments: wrapTranslationRegistry(createRegistry([])),
		populations: wrapTranslationRegistry(populations),
		passives: {
			list: () => [],
			get: () => undefined,
			getDefinition: () => undefined,
			definitions: () => [],
			get evaluationMods() {
				return EMPTY_MODIFIERS;
			},
		},
		phases: [],
		activePlayer: toTranslationPlayer({
			id: 'player-1',
			name: 'Player One',
			resources: {},
			population: {},
		}),
		opponent: toTranslationPlayer({
			id: 'player-2',
			name: 'Player Two',
			resources: {},
			population: {},
		}),
		rules: {
			tieredResourceKey: 'happiness',
			tierDefinitions: [],
			winConditions: [],
		},
		recentResourceGains: [],
		compensations,
		pullEffectLog: () => undefined,
		actionCostResource: 'resource.action',
		assets: {
			resources: {},
			stats: {},
			populations: {
				[population.id]: { icon: population.icon, label: population.name },
			},
			population: { icon: '👥', label: 'Population' },
			land: {},
			slot: {},
			passive: {},
			upkeep: { icon: '🧹', label: 'Upkeep' },
			modifiers: {},
			triggers: {},
			tierSummaries: {},
			formatPassiveRemoval: (description: string) =>
				`Active as long as ${description}`,
		},
	};
}

function flatten(summary: Summary): string[] {
	const result: string[] = [];
	for (const entry of summary) {
		if (typeof entry === 'string') {
			result.push(entry);
		} else {
			result.push(...flatten(entry.items));
		}
	}
	return result;
}

describe('population effect translation', () => {
	const translationContext = createTranslationContext();
	const actionId = translationContext.actions.get('action.raiseCouncil').id;
	const roleId = translationContext.populations.get('role.council').id;

	it('summarizes population-raising action for specific role', () => {
		const summary = summarizeContent('action', actionId, translationContext, {
			role: roleId,
		});
		const flat = flatten(summary);
		const expected = summarizeEffects(
			[
				{
					type: 'population',
					method: 'add',
					params: { role: roleId },
				},
			],
			translationContext,
		)[0];
		expect(flat).toContain(expected);
	});

	it('handles population removal effect', () => {
		const removalEffect = {
			type: 'population' as const,
			method: 'remove' as const,
			params: { role: roleId },
		};
		const summary = summarizeEffects([removalEffect], translationContext);
		const desc = describeEffects([removalEffect], translationContext);
		const expectedSummary = summarizeEffects(
			[removalEffect],
			translationContext,
		)[0];
		const expectedDesc = describeEffects(
			[removalEffect],
			translationContext,
		)[0];
		expect(summary).toContain(expectedSummary);
		expect(desc).toContain(expectedDesc);
	});
});
