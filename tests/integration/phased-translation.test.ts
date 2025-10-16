import { describe, it, expect } from 'vitest';

import { createEngine } from '@kingdom-builder/engine';
import type { EngineContext } from '@kingdom-builder/engine';
import {
	summarizeContent,
	describeContent,
} from '@kingdom-builder/web/translation/content';
// prettier-ignore
import type {
	PhasedDef,
} from '@kingdom-builder/web/translation/content/phased';
import {
	RESOURCES,
	PHASES,
	POPULATIONS,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
// prettier-ignore
import {
	createContentFactory,
} from '@kingdom-builder/testing';
import { snapshotEngine } from '../../packages/engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../packages/web/src/translation/context/createTranslationContext';
import { DEFAULT_TRIGGER_METADATA } from '../../packages/web/src/contexts/defaultRegistryMetadata';
import { createSessionRegistries } from '../../packages/web/tests/helpers/sessionRegistries';
import { formatDetailText } from '../../packages/web/src/utils/stats/format';

type Entry = string | { title: string; items: Entry[] };

function findEntry(
	entries: Entry[],
	title: string,
): { title: string; items: Entry[] } | undefined {
	for (const entry of entries) {
		if (typeof entry === 'string') {
			continue;
		}
		if (entry.title === title) {
			return entry;
		}
		const nested = findEntry(entry.items, title);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

function formatStepTriggerLabel(
	ctx: EngineContext,
	triggerKey: string,
): string | undefined {
	for (const phase of ctx.phases) {
		const steps = phase.steps ?? [];
		for (const step of steps) {
			const triggers = step.triggers ?? [];
			if (!triggers.includes(triggerKey)) {
				continue;
			}
			const phaseLabelParts = [
				phase.icon,
				phase.label ?? formatDetailText(phase.id),
			]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			const stepLabelParts = (step.title ?? formatDetailText(step.id))
				?.trim()
				.replace(/\s+/gu, ' ');
			const sections: string[] = [];
			if (phaseLabelParts.length) {
				sections.push(`${phaseLabelParts} Phase`);
			}
			if (stepLabelParts && stepLabelParts.length) {
				sections.push(`${stepLabelParts} step`);
			}
			if (!sections.length) {
				return undefined;
			}
			return sections.join(' — ');
		}
	}
	return undefined;
}

describe('PhasedTranslator step triggers', () => {
	const addedStep = {
		icon: '🧪',
		future: 'During test step',
		past: 'Test step',
	} as const;
	const targetStepKey = 'onGainIncomeStep';

	it('renders dynamic step metadata from trigger registry', () => {
		const content = createContentFactory();
		const development = content.development();
		const stored = content.developments.get(
			development.id,
		) as unknown as PhasedDef;

		const [resourceKey] = Object.keys(RESOURCES) as ResourceKey[];
		const makeEffect = (amount: number) => ({
			type: 'resource',
			method: 'add',
			params: { key: resourceKey, amount },
		});

		const defaultStepKeys = Object.keys(DEFAULT_TRIGGER_METADATA ?? {}).filter(
			(key) => key.endsWith('Step'),
		);
		expect(defaultStepKeys).toContain(targetStepKey);
		defaultStepKeys.forEach((key, index) => {
			stored[key as keyof PhasedDef] = [makeEffect(index + 1)];
		});

		const ctx = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		const snapshot = snapshotEngine(ctx);
		snapshot.metadata.triggers = {
			...(snapshot.metadata.triggers ?? {}),
			[targetStepKey]: addedStep,
		};
		const registries = createSessionRegistries();
		registries.developments.add(
			development.id,
			content.developments.get(development.id)!,
		);
		const translationContext = createTranslationContext(
			snapshot,
			registries,
			snapshot.metadata,
			{
				ruleSnapshot: snapshot.rules,
				passiveRecords: snapshot.passiveRecords,
			},
		);

		const triggerAssets = translationContext.assets.triggers;
		const stepKeys = Object.keys(triggerAssets).filter((key) => {
			return key.endsWith('Step');
		});

		expect(stepKeys).toContain(targetStepKey);
		const overriddenAsset = triggerAssets[targetStepKey];
		expect(overriddenAsset).toMatchObject({
			icon: addedStep.icon,
			future: addedStep.future,
			past: addedStep.past,
		});

		const summary = summarizeContent(
			'development',
			development.id,
			translationContext,
		) as unknown as Entry[];
		const details = describeContent(
			'development',
			development.id,
			translationContext,
		) as unknown as Entry[];

		for (const key of stepKeys) {
			const asset = triggerAssets[key];
			const iconText = asset?.icon?.trim() ?? '';
			const futureText = asset?.future?.trim() ?? asset?.label?.trim() ?? '';
			const expectedTitle = [iconText, futureText]
				.filter((value) => value.length > 0)
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(ctx, key);
			const resolvedTitle = stepLabel
				? [iconText, `During ${stepLabel}`]
						.filter((value) => value.trim().length > 0)
						.join(' ')
						.trim()
				: expectedTitle;

			const summaryEntry =
				findEntry(summary, resolvedTitle) || findEntry(summary, expectedTitle);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();
			if (key === targetStepKey) {
				const summaryTitle =
					typeof summaryEntry === 'string' ? summaryEntry : summaryEntry.title;
				expect(summaryTitle).toContain(addedStep.icon);
			}

			const describeEntry =
				findEntry(details, resolvedTitle) || findEntry(details, expectedTitle);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();
		}
	});
});
