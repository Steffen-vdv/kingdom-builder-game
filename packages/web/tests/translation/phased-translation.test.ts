import { describe, it, expect } from 'vitest';

import { buildSyntheticTranslationContext } from '../helpers/createSyntheticTranslationContext';
import { createDefaultTriggerMetadata } from '../../src/contexts/defaultRegistryMetadata';
import {
	selectTriggerDisplay,
	selectTriggerEntries,
} from '../../src/translation/context/assetSelectors';

describe('Phased trigger metadata selectors', () => {
	it('prefers trigger metadata overrides for future labels', () => {
		const overrideFuture = 'While forging prototypes';
		const overridePast = 'Forging prototypes';
		const overrideIcon = '🛠️';
		const { translationContext } = buildSyntheticTranslationContext(
			({ session }) => {
				session.metadata.triggers = {
					...session.metadata.triggers,
					onGainIncomeStep: {
						icon: overrideIcon,
						future: overrideFuture,
						past: overridePast,
					},
				};
			},
		);
		const display = selectTriggerDisplay(
			translationContext.assets,
			'onGainIncomeStep',
		);
		expect(display.icon).toBe(overrideIcon);
		expect(display.future).toBe(overrideFuture);
		expect(display.past).toBe(overridePast);
	});

	it('falls back to past metadata when future copy is missing', () => {
		const overridePast = 'Custom upkeep window';
		const overrideIcon = '🧪';
		const { translationContext } = buildSyntheticTranslationContext(
			({ session }) => {
				session.metadata.triggers = {
					...session.metadata.triggers,
					onPayUpkeepStep: {
						icon: overrideIcon,
						past: overridePast,
					},
				};
			},
		);
		const display = selectTriggerDisplay(
			translationContext.assets,
			'onPayUpkeepStep',
		);
		expect(display.icon).toBe(overrideIcon);
		expect(display.past).toBe(overridePast);
		expect(display.future).toBe('During upkeep step');
	});

	it('provides default trigger metadata when no overrides exist', () => {
		const defaultMetadata = createDefaultTriggerMetadata();
		const fallback = defaultMetadata.onGainIncomeStep ?? {};
		const { translationContext } = buildSyntheticTranslationContext(
			({ session }) => {
				const triggers = { ...session.metadata.triggers };
				delete triggers.onGainIncomeStep;
				session.metadata.triggers = triggers;
			},
		);
		const display = selectTriggerDisplay(
			translationContext.assets,
			'onGainIncomeStep',
		);
		const expectedLabel = fallback.label ?? fallback.past;
		expect(display).toEqual({
			icon: fallback.icon,
			future: fallback.future,
			past: fallback.past,
			label: expectedLabel,
		});
		const entries = selectTriggerEntries(undefined);
		expect(entries.onGainIncomeStep).toEqual({
			icon: fallback.icon,
			future: fallback.future,
			past: fallback.past,
			label: expectedLabel,
		});
	});
});
