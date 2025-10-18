import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { summarizeContent } from '../src/translation/content';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

describe('action stat summaries', () => {
	it('include stat icons alongside stat changes', () => {
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
		const formatSummary = (
			key: string,
			method: 'add' | 'remove',
			amount: number,
		): string => {
			const entry = translationContext.assets.stats[key] ?? {};
			const label = entry.label ?? key;
			const icon = (() => {
				if (typeof entry.icon !== 'string') {
					return '';
				}
				const trimmed = entry.icon.trim();
				return trimmed.length > 0 && trimmed !== key ? trimmed : '';
			})();
			const prefix = (() => {
				const format = entry.format as { prefix?: string } | undefined;
				if (!format || typeof format.prefix !== 'string') {
					return '';
				}
				const trimmed = format.prefix.trim();
				return trimmed.length > 0 ? trimmed : '';
			})();
			const change = method === 'remove' ? -amount : amount;
			const sign = change >= 0 ? '+' : '';
			const leading: string[] = [];
			if (prefix) {
				leading.push(prefix);
			}
			if (icon) {
				leading.push(icon);
			} else if (label) {
				leading.push(label);
			}
			const delta = `${sign}${change}`;
			return leading.length > 0 ? `${leading.join(' ')} ${delta}` : delta;
		};
		const expected = statEffects.map(({ key, method, amount }) => {
			return formatSummary(key, method, amount);
		});
		expect(summary).toEqual(expected);
	});
});
