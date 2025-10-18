import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { describeContent, summarizeContent } from '../src/translation/content';
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
		expect(summary).toEqual([
			'⚔️ +1',
			'🛡️ -2',
			'🌀 +0.1',
			'Max 👥 +3',
			'💤 +1',
		]);
	});

	it('formats stat changes with case-insensitive keys', () => {
		const factory = createContentFactory();
		let actionId: string | undefined;
		const { translationContext } = buildSyntheticTranslationContext(
			({ registries: actionRegistries }) => {
				const showcaseAction = factory.action({
					name: 'Case Showcase',
					icon: '🧮',
					effects: [
						{
							type: 'stat',
							method: 'add',
							params: { key: 'MaxPopulation', amount: 2 },
						},
						{
							type: 'stat',
							method: 'remove',
							params: { key: 'FortificationStrength', amount: 3 },
						},
					],
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
		const description = describeContent(
			'action',
			actionId as string,
			translationContext,
		);
		const stats = translationContext.assets.stats;
		const resolveEntry = (key: string) =>
			stats[key] ?? stats[key.charAt(0).toLowerCase() + key.slice(1)] ?? {};
		const resolveIcon = (entry: { icon?: string }, fallback: string) => {
			const icon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
			return icon && icon !== fallback ? icon : fallback;
		};
		const resolveLabel = (entry: { label?: string }, fallback: string) =>
			typeof entry.label === 'string' && entry.label.trim().length > 0
				? entry.label
				: fallback;
		const resolvePrefix = (entry: { format?: unknown }) =>
			((entry.format as { prefix?: string } | undefined)?.prefix ?? '').trim();
		const applyPrefix = (value: string, prefix: string) => {
			if (!prefix) {
				return value;
			}
			const trimmedValue = value.trimStart();
			return trimmedValue.toLowerCase().startsWith(prefix.toLowerCase())
				? trimmedValue
				: `${prefix} ${trimmedValue}`.replace(/\s+/gu, ' ');
		};
		const maxEntry = resolveEntry('MaxPopulation');
		const fortEntry = resolveEntry('FortificationStrength');
		const maxPrefix = resolvePrefix(maxEntry);
		const fortPrefix = resolvePrefix(fortEntry);
		const maxIcon = resolveIcon(maxEntry, '👥');
		const fortIcon = resolveIcon(fortEntry, '🛡️');
		const maxLabel = resolveLabel(maxEntry, 'Maximum Population');
		const fortLabel = resolveLabel(fortEntry, 'Fortification Strength');
		expect(summary).toEqual([
			`${applyPrefix(maxIcon, maxPrefix)} +2`,
			`${applyPrefix(fortIcon, fortPrefix)} -3`,
		]);
		expect(description).toEqual([
			`${maxIcon} +2 ${applyPrefix(maxLabel, maxPrefix)}`,
			`${fortIcon} -3 ${applyPrefix(fortLabel, fortPrefix)}`,
		]);
	});
});
