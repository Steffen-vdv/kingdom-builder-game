import { describe, expect, it } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { describeContent, summarizeContent } from '../src/translation/content';
import { selectStatDescriptor } from '../src/translation/effects/registrySelectors';
import { signed } from '../src/translation/effects/helpers';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';

const STAT_EFFECTS = [
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
] as const;

function resolveIcon(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon =
		typeof descriptor.icon === 'string' ? descriptor.icon.trim() : '';
	if (!icon || icon === statKey) {
		return '';
	}
	return icon;
}

function normalizePrefix(prefix: string | undefined): string {
	if (typeof prefix !== 'string') {
		return '';
	}
	const trimmed = prefix.trim();
	return trimmed.length > 0 ? trimmed : '';
}

function formatSummaryDisplay(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
): string {
	const icon = resolveIcon(descriptor, statKey);
	const label = descriptor.label || statKey;
	const prefix = normalizePrefix(descriptor.format?.prefix);
	const parts: string[] = [];
	if (prefix && (icon || !label.startsWith(prefix))) {
		parts.push(prefix);
	}
	parts.push(icon || label);
	return parts.join(' ').trim();
}

function formatStatDelta(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	amount: number,
): string {
	if (descriptor.format?.percent) {
		const percentValue = amount * 100;
		return `${signed(percentValue)}${percentValue}%`;
	}
	return `${signed(amount)}${amount}`;
}

function formatSummaryExpectation(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	amount: number,
): string {
	const display = formatSummaryDisplay(descriptor, statKey);
	const delta = formatStatDelta(descriptor, amount);
	return display ? `${display} ${delta}` : delta;
}

function formatDescriptionExpectation(
	descriptor: ReturnType<typeof selectStatDescriptor>,
	statKey: string,
	amount: number,
): string {
	const icon = resolveIcon(descriptor, statKey);
	const label = descriptor.label || statKey;
	const delta = formatStatDelta(descriptor, amount);
	const detail = `${delta} ${label}`.trim();
	return icon ? `${icon} ${detail}` : detail;
}

function resolveAmount(
	method: (typeof STAT_EFFECTS)[number]['method'],
	amount: number,
): number {
	return method === 'remove' ? -amount : amount;
}

function createStatShowcase() {
	const factory = createContentFactory();
	let actionId: string | undefined;
	const { translationContext } = buildSyntheticTranslationContext(
		({ registries: actionRegistries }) => {
			const showcaseAction = factory.action({
				name: 'Stat Showcase',
				icon: '🧮',
				effects: STAT_EFFECTS.map(({ key, method, amount }) => ({
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
	if (!actionId) {
		throw new Error('Failed to create stat showcase action');
	}
	return { translationContext, actionId };
}

describe('action stat translations', () => {
	it('summaries highlight stat icons with deltas', () => {
		const { translationContext, actionId } = createStatShowcase();
		const summary = summarizeContent('action', actionId, translationContext);
		const expected = STAT_EFFECTS.map(({ key, method, amount }) => {
			const descriptor = selectStatDescriptor(translationContext, key);
			const resolvedAmount = resolveAmount(method, amount);
			return formatSummaryExpectation(descriptor, key, resolvedAmount);
		});
		expect(summary).toEqual(expected);
	});

	it('descriptions include stat icons with labeled deltas', () => {
		const { translationContext, actionId } = createStatShowcase();
		const description = describeContent('action', actionId, translationContext);
		const expected = STAT_EFFECTS.map(({ key, method, amount }) => {
			const descriptor = selectStatDescriptor(translationContext, key);
			const resolvedAmount = resolveAmount(method, amount);
			return formatDescriptionExpectation(descriptor, key, resolvedAmount);
		});
		expect(description).toEqual(expected);
	});
});
