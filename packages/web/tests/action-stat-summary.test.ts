import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { summarizeContent } from '../src/translation/content';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

describe('action stat summaries', () => {
	it('include stat icons and labels alongside changes', () => {
		const factory = createContentFactory();
		const statEffects = [
			{
				key: 'armyStrength',
				method: 'add' as const,
				amount: 1,
			},
			{
				key: 'fortificationStrength',
				method: 'remove' as const,
				amount: 2,
			},
			{
				key: 'absorption',
				method: 'add' as const,
				amount: 0.1,
				percent: true,
			},
			{
				key: 'maxPopulation',
				method: 'add' as const,
				amount: 3,
			},
			{
				key: 'warWeariness',
				method: 'add' as const,
				amount: 1,
			},
		];
		let actionId: string | undefined;
		const { translationContext } = buildSyntheticTranslationContext(
			({ registries: actionRegistries }) => {
				const showcaseAction = factory.action({
					name: 'Stat Showcase',
					icon: '🧮',
					effects: statEffects.map(({ key, method, amount }) => ({
						type: 'stat',
						method,
						params: { key, amount },
					})),
				});
				actionId = showcaseAction.id;
				actionRegistries.actions.add(showcaseAction.id, {
					...showcaseAction,
				});
			},
		);
		expect(actionId).toBeDefined();
		const summary = summarizeContent(
			'action',
			actionId as string,
			translationContext,
		);
		const formatDisplay = (key: string): string => {
			const entry = translationContext.assets.stats[key] ?? {};
			const label = entry.label ?? key;
			const icon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
			const prefix =
				(entry.format as { prefix?: string } | undefined)?.prefix ?? '';
			const iconOrLabel = icon && icon !== key ? icon : label;
			return prefix ? `${prefix}${iconOrLabel}` : iconOrLabel;
		};
		const expected = statEffects.map(({ key, method, amount, percent }) => {
			const display = formatDisplay(key);
			if (percent) {
				const pct = amount * 100;
				const sign = pct >= 0 ? '+' : '';
				return `${display} ${sign}${pct}%`;
			}
			const delta = method === 'remove' ? -amount : amount;
			const sign = delta >= 0 ? '+' : '';
			return `${display} ${sign}${delta}`;
		});
		expect(summary).toEqual(expected);
	});
});
