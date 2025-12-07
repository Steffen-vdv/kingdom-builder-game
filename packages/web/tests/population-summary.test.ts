import { describe, it, expect } from 'vitest';
import {
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

describe('population resource effect translation', () => {
	const registries = createSessionRegistries();
	const resourceKeys = Object.keys(registries.resources);
	const actionCostResource = resourceKeys[0] ?? 'resource.ap';

	// Create a synthetic population resource ID
	const populationResourceId = 'resource:population:role:council';

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
		resourceMetadata: {
			[populationResourceId]: {
				icon: '👑',
				label: 'Council',
			},
		},
	});

	it('summarizes resource add effect for population role', () => {
		const addEffect = {
			type: 'resource' as const,
			method: 'add' as const,
			params: {
				resourceId: populationResourceId,
				change: { type: 'amount', amount: 1 },
			},
		};
		const summary = summarizeEffects([addEffect], translationContext);
		const flat = flatten(summary);
		// Should contain the icon and a positive change indicator
		expect(flat.some((s) => s.includes('👑'))).toBe(true);
		expect(flat.some((s) => s.includes('+1'))).toBe(true);
	});

	it('summarizes resource remove effect for population role', () => {
		const removeEffect = {
			type: 'resource' as const,
			method: 'remove' as const,
			params: {
				resourceId: populationResourceId,
				change: { type: 'amount', amount: 1 },
			},
		};
		const summary = summarizeEffects([removeEffect], translationContext);
		const desc = describeEffects([removeEffect], translationContext);
		const flatSummary = flatten(summary);
		const flatDesc = flatten(desc);
		// Summary should show negative change
		expect(flatSummary.some((s) => s.includes('👑'))).toBe(true);
		expect(flatSummary.some((s) => s.includes('-1'))).toBe(true);
		// Description should show negative change with label
		expect(flatDesc.some((s) => s.includes('👑'))).toBe(true);
		expect(flatDesc.some((s) => s.includes('-1'))).toBe(true);
		expect(flatDesc.some((s) => s.includes('Council'))).toBe(true);
	});
});
