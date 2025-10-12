import { describe, it, expect } from 'vitest';
import {
	summarizeContent,
	summarizeEffects,
	describeEffects,
	type Summary,
} from '../src/translation';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	createTranslationContextStub,
	wrapTranslationRegistry,
	toTranslationPlayer,
} from './helpers/translationContextStub';

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
	const registries = createSessionRegistries();
	const resourceKeys = Object.keys(registries.resources);
	const actionCostResource = resourceKeys[0] ?? 'resource.ap';
	const translationContext = createTranslationContextStub({
		actions: wrapTranslationRegistry(registries.actions),
		buildings: wrapTranslationRegistry(registries.buildings),
		developments: wrapTranslationRegistry(registries.developments),
		populations: wrapTranslationRegistry(registries.populations),
		phases: [
			{
				id: 'phase.action',
				label: 'Action Phase',
				action: true,
				steps: [],
			},
		],
		actionCostResource,
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
	});

	it('summarizes population-raising action for specific role', () => {
		const raiseEntry = registries.actions
			.entries()
			.find(([, action]) =>
				action.effects.some(
					(effect) => effect.type === 'population' && effect.method === 'add',
				),
			);
		const raiseId = raiseEntry?.[0];
		const roleEffect = raiseEntry?.[1].effects.find(
			(effect) => effect.type === 'population' && effect.method === 'add',
		);
		const roleId = roleEffect?.params?.role as string | undefined;
		if (!raiseId || !roleId) {
			throw new Error('Unable to locate population-raising action.');
		}
		const summary = summarizeContent('action', raiseId, translationContext, {
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
		const removalRole = registries.actions
			.entries()
			.flatMap(([, action]) => action.effects)
			.find((effect) => effect.type === 'population' && effect.params?.role)
			?.params?.role as string | undefined;
		if (!removalRole) {
			throw new Error('No population role found for removal test.');
		}
		const removalEffect = {
			type: 'population' as const,
			method: 'remove' as const,
			params: { role: removalRole },
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
