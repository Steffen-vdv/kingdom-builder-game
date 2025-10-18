import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { describeContent, summarizeContent } from '../src/translation/content';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

describe('action stat summaries', () => {
	it('formats stat changes with icons and prefixes', () => {
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
				key: 'MaxPopulation',
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
		const normalizeKey = (key: string): string => {
			const stats = translationContext.assets.stats;
			if (key in stats) {
				return key;
			}
			const loweredFirst = key.charAt(0).toLowerCase() + key.slice(1);
			if (loweredFirst in stats) {
				return loweredFirst;
			}
			const normalized = key.toLowerCase();
			const candidate = Object.keys(stats).find(
				(entryKey) => entryKey.toLowerCase() === normalized,
			);
			return candidate ?? key;
		};
		const summary = summarizeContent(
			'action',
			actionId as string,
			translationContext,
		);
		const expectedSummary = statEffects.map(
			({ key, method, amount, percent }) => {
				const resolvedKey = normalizeKey(key);
				const entry = translationContext.assets.stats[resolvedKey] ?? {};
				const prefix =
					(entry.format as { prefix?: string } | undefined)?.prefix ?? '';
				const icon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
				const label = entry.label ?? resolvedKey;
				const subject = icon && icon !== resolvedKey ? icon : label;
				if (percent) {
					const pct = amount * 100;
					const sign = pct >= 0 ? '+' : '';
					return `${prefix}${subject} ${sign}${pct}%`;
				}
				const delta = method === 'remove' ? -amount : amount;
				const sign = delta >= 0 ? '+' : '';
				return `${prefix}${subject} ${sign}${delta}`;
			},
		);
		expect(summary).toEqual(expectedSummary);

		const description = describeContent(
			'action',
			actionId as string,
			translationContext,
		);
		const expectedDescription = statEffects.map(
			({ key, method, amount, percent }) => {
				const resolvedKey = normalizeKey(key);
				const entry = translationContext.assets.stats[resolvedKey] ?? {};
				const icon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
				const label = entry.label ?? resolvedKey;
				const iconPart = icon && icon !== resolvedKey ? icon : undefined;
				if (percent) {
					const pct = amount * 100;
					const sign = pct >= 0 ? '+' : '';
					return [iconPart, `${sign}${pct}%`, label]
						.filter((part): part is string => Boolean(part))
						.join(' ');
				}
				const delta = method === 'remove' ? -amount : amount;
				const sign = delta >= 0 ? '+' : '';
				return [iconPart, `${sign}${delta}`, label]
					.filter((part): part is string => Boolean(part))
					.join(' ');
			},
		);
		expect(description).toEqual(expectedDescription);
	});
});
