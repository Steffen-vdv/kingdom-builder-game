import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@boardsmith/testing';
import { describeContent, summarizeContent } from '../src/translation/content';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

type StatEffectScenario = {
	key: string;
	method: 'add' | 'remove';
	amount: number;
};

// stat resource IDs - must match testResourceMetadata.ts
const STAT_IDS = {
	maxPopulation: 'resource:core:max-population',
	fortificationStrength: 'resource:core:fortification-strength',
	absorption: 'resource:core:absorption',
	armyStrength: 'resource:core:army-strength',
} as const;

// Map legacy stat keys to Resource IDs
const STAT_KEY_MAP: Record<string, string> = {
	maxPopulation: STAT_IDS.maxPopulation,
	fortificationStrength: STAT_IDS.fortificationStrength,
	absorption: STAT_IDS.absorption,
	armyStrength: STAT_IDS.armyStrength,
	// Handle capitalized variants
	MaxPopulation: STAT_IDS.maxPopulation,
	FortificationStrength: STAT_IDS.fortificationStrength,
	Absorption: STAT_IDS.absorption,
	ArmyStrength: STAT_IDS.armyStrength,
};

function setupStatAction(statEffects: StatEffectScenario[]) {
	const factory = createContentFactory();
	let actionId: string | undefined;
	const { translationContext } = buildSyntheticTranslationContext(
		({ registries: actionRegistries }) => {
			const showcaseAction = factory.action({
				name: 'Stat Showcase',
				icon: '🧮',
				effects: statEffects.map(({ key, method, amount }) => ({
					type: 'resource',
					method,
					params: {
						resourceId: STAT_KEY_MAP[key] ?? key,
						change: { type: 'amount', amount },
					},
				})),
			});
			actionId = showcaseAction.id;
			actionRegistries.actions.add(showcaseAction.id, {
				...showcaseAction,
			});
		},
	);
	if (!actionId) {
		throw new Error('Stat showcase action was not created.');
	}
	return { actionId, translationContext };
}

const BASE_STAT_EFFECTS: StatEffectScenario[] = [
	{ key: 'maxPopulation', method: 'add', amount: 1 },
	{ key: 'fortificationStrength', method: 'add', amount: 1 },
	{ key: 'absorption', method: 'add', amount: 0.2 },
	{ key: 'armyStrength', method: 'add', amount: 1 },
	{ key: 'fortificationStrength', method: 'remove', amount: 3 },
];

describe('action stat summaries', () => {
	it('summarizes stat changes with icons and signed amounts', () => {
		const { actionId, translationContext } = setupStatAction(BASE_STAT_EFFECTS);
		const summary = summarizeContent('action', actionId, translationContext);
		expect(summary).toEqual([
			'👥 +1 Max',
			'🛡️ +1',
			'🌀 +20%',
			'⚔️ +1',
			'🛡️ -3',
		]);
	});

	it('describes stat changes using icons and labels', () => {
		const { actionId, translationContext } = setupStatAction(BASE_STAT_EFFECTS);
		const description = describeContent('action', actionId, translationContext);
		const lines = description.filter(
			(entry): entry is string => typeof entry === 'string',
		);
		expect(lines).toEqual([
			'👥 +1 Max Population',
			'🛡️ +1 Fortification Strength',
			'🌀 +20% Absorption',
			'⚔️ +1 Army Strength',
			'🛡️ -3 Fortification Strength',
		]);
	});

	it('normalizes stat keys provided with capitalized casing', () => {
		const capitalizedEffects = BASE_STAT_EFFECTS.map(({ key, ...rest }) => ({
			key: key.charAt(0).toUpperCase() + key.slice(1),
			...rest,
		}));
		const { actionId, translationContext } =
			setupStatAction(capitalizedEffects);
		const summary = summarizeContent('action', actionId, translationContext);
		const description = describeContent('action', actionId, translationContext);
		const lines = description.filter(
			(entry): entry is string => typeof entry === 'string',
		);
		expect(summary).toEqual([
			'👥 +1 Max',
			'🛡️ +1',
			'🌀 +20%',
			'⚔️ +1',
			'🛡️ -3',
		]);
		expect(lines).toEqual([
			'👥 +1 Max Population',
			'🛡️ +1 Fortification Strength',
			'🌀 +20% Absorption',
			'⚔️ +1 Army Strength',
			'🛡️ -3 Fortification Strength',
		]);
	});
	it('formats percent-based stat changes using percentage notation', () => {
		const { actionId, translationContext } = setupStatAction([
			{ key: 'absorption', method: 'add', amount: 0.5 },
		]);
		const summary = summarizeContent('action', actionId, translationContext);
		const description = describeContent('action', actionId, translationContext);
		const lines = description.filter(
			(entry): entry is string => typeof entry === 'string',
		);
		expect(summary).toEqual(['🌀 +50%']);
		expect(lines).toEqual(['🌀 +50% Absorption']);
	});
});
