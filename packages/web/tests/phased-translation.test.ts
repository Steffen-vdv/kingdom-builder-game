import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/translation/effects', () => ({
	summarizeEffects: vi.fn(() => ['effect']),
	describeEffects: vi.fn(() => ['effect']),
}));

import type { SummaryEntry } from '../src/translation/content/types';
import { PhasedTranslator } from '../src/translation/content/phased';
import type { PhasedDef } from '../src/translation/content/phased';
import { buildSyntheticTranslationContext } from './helpers/createSyntheticTranslationContext';
import type {
	TranslationContext,
	TranslationTriggerAsset,
} from '../src/translation/context';
import { DEFAULT_TRIGGER_METADATA } from '../src/contexts/defaultRegistryMetadata';

function findSummaryGroup(entries: SummaryEntry[], title: string) {
	for (const entry of entries) {
		if (typeof entry === 'string') {
			continue;
		}
		if (entry.title === title) {
			return entry;
		}
		const nested = findSummaryGroup(entry.items, title);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

function getResourceKey(context: TranslationContext): string {
	const [resourceKey] = Object.keys(context.assets.resources);
	if (!resourceKey) {
		throw new Error('Expected translation context to provide a resource key.');
	}
	return resourceKey;
}

describe('PhasedTranslator metadata overrides', () => {
	it('uses trigger future metadata when phases omit the step', () => {
		const { translationContext } = buildSyntheticTranslationContext(
			({ session }) => {
				session.metadata.triggers = {
					...(session.metadata.triggers ?? {}),
					onTestStep: {
						icon: '🧪',
						future: 'While testing new triggers',
						past: 'Testing step',
					},
				};
			},
		);
		const translator = new PhasedTranslator();
		const resourceKey = getResourceKey(translationContext);
		const phasedDefinition: PhasedDef = {
			onTestStep: [
				{
					type: 'resource',
					method: 'add',
					params: { key: resourceKey, amount: 1 },
				},
			],
		};

		const summary = translator.summarize(phasedDefinition, translationContext);
		const group = findSummaryGroup(summary, '🧪 While testing new triggers');

		expect(group?.items.length).toBeGreaterThan(0);
	});

	it('falls back to trigger past metadata when future text is missing', () => {
		const { translationContext } = buildSyntheticTranslationContext(
			({ session }) => {
				session.metadata.triggers = {
					...(session.metadata.triggers ?? {}),
					onPastOnlyStep: {
						icon: '🕰️',
						past: 'Historical trigger',
					},
				};
			},
		);
		const translator = new PhasedTranslator();
		const resourceKey = getResourceKey(translationContext);
		const phasedDefinition: PhasedDef = {
			onPastOnlyStep: [
				{
					type: 'resource',
					method: 'add',
					params: { key: resourceKey, amount: 2 },
				},
			],
		};

		const summary = translator.summarize(phasedDefinition, translationContext);
		const group = findSummaryGroup(summary, '🕰️ Historical trigger');

		expect(group?.items.length).toBeGreaterThan(0);
	});

	it('uses default trigger metadata when assets omit the entry', () => {
		const { translationContext } = buildSyntheticTranslationContext();
		const translator = new PhasedTranslator();
		const resourceKey = getResourceKey(translationContext);
		const phasedDefinition: PhasedDef = {
			onGainIncomeStep: [
				{
					type: 'resource',
					method: 'add',
					params: { key: resourceKey, amount: 3 },
				},
			],
		};
		const contextWithMissingTrigger = {
			...translationContext,
			assets: {
				...translationContext.assets,
				triggers: Object.freeze({}) as Readonly<
					Record<string, TranslationTriggerAsset>
				>,
			},
		} as TranslationContext;
		const fallback = DEFAULT_TRIGGER_METADATA?.onGainIncomeStep;
		const futureText =
			fallback?.future ??
			fallback?.label ??
			fallback?.past ??
			'onGainIncomeStep';
		const expectedTitle = [
			fallback?.icon?.trim(),
			futureText.trim().replace(/\s+/gu, ' '),
		]
			.filter((value): value is string => Boolean(value && value.length))
			.join(' ')
			.trim();

		const summary = translator.summarize(
			phasedDefinition,
			contextWithMissingTrigger,
		);
		const group = findSummaryGroup(summary, expectedTitle);

		expect(group?.items.length).toBeGreaterThan(0);
	});
});
