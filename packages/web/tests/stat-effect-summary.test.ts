import { describe, expect, it } from 'vitest';
import { summarizeEffects } from '../src/translation/effects';
import type {
	TranslationAssets,
	TranslationContext,
} from '../src/translation/context';
import type { EffectDef } from '@kingdom-builder/protocol';

type Summary = ReturnType<typeof summarizeEffects>;

function createTranslationContext(): TranslationContext {
	const stats = Object.freeze({
		armyStrength: { icon: '⚔️', label: 'Army Strength' },
		fortificationStrength: { icon: '🛡️', label: 'Fortification Strength' },
		absorption: { icon: '🌀', label: 'Absorption' },
		maxPopulation: { icon: '👥', label: 'Max Population' },
		warWeariness: { icon: '💤', label: 'War Weariness' },
		growth: { icon: '📈', label: 'Growth' },
	});
	const assets: TranslationAssets = {
		resources: Object.freeze({}),
		stats,
		populations: Object.freeze({}),
		population: Object.freeze({}),
		land: Object.freeze({}),
		slot: Object.freeze({}),
		passive: Object.freeze({}),
		transfer: Object.freeze({}),
		upkeep: Object.freeze({}),
		modifiers: Object.freeze({}),
		triggers: Object.freeze({}),
		tierSummaries: Object.freeze({}),
		formatPassiveRemoval: (description: string) => description,
	};
	return { assets } as unknown as TranslationContext;
}

function summarize(effect: EffectDef): Summary {
	const context = createTranslationContext();
	return summarizeEffects([effect], context);
}

describe('stat effect summaries', () => {
	it('formats additive stat changes with icons and labels', () => {
		const [summary] = summarize({
			type: 'stat',
			method: 'add',
			params: { key: 'armyStrength', amount: 1 },
		});
		expect(summary).toBe('⚔️ Army Strength +1');
	});

	it('formats stat removal with icons and labels', () => {
		const [summary] = summarize({
			type: 'stat',
			method: 'remove',
			params: { key: 'fortificationStrength', amount: 2 },
		});
		expect(summary).toBe('🛡️ Fortification Strength -2');
	});

	it('includes labels for max population adjustments', () => {
		const [summary] = summarize({
			type: 'stat',
			method: 'add',
			params: { key: 'maxPopulation', amount: 3 },
		});
		expect(summary).toBe('👥 Max Population +3');
	});

	it('formats percentage gains with icons and labels', () => {
		const [summary] = summarize({
			type: 'stat',
			method: 'add_pct',
			params: { key: 'absorption', percent: 0.25 },
		});
		expect(summary).toBe('🌀 Absorption +25%');
	});

	it('includes source stat labels for percentage scaling', () => {
		const [summary] = summarize({
			type: 'stat',
			method: 'add_pct',
			params: { key: 'armyStrength', percentStat: 'growth' },
		});
		expect(summary).toBe('⚔️ Army Strength 📈 Growth');
	});

	it('includes labels for war weariness adjustments', () => {
		const [summary] = summarize({
			type: 'stat',
			method: 'add',
			params: { key: 'warWeariness', amount: -1 },
		});
		expect(summary).toBe('💤 War Weariness -1');
	});
});
