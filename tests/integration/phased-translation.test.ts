import { describe, it, expect } from 'vitest';

import {
	summarizeContent,
	describeContent,
} from '@kingdom-builder/web/translation/content';
// prettier-ignore
import type {
PhasedDef,
} from '@kingdom-builder/web/translation/content/phased';
// prettier-ignore
import {
createContentFactory,
} from '@kingdom-builder/testing';
import type { TranslationContext } from '@kingdom-builder/web/translation/context';
import { formatDetailText } from '../../packages/web/src/utils/stats/format';
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

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
	ctx: TranslationContext,
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
	it('renders dynamic step metadata from trigger info', () => {
		const content = createContentFactory();
		const development = content.development();

		const { translationContext, registries } = buildSyntheticTranslationContext(
			({ registries, session }) => {
				registries.developments.add(development.id, development);
				const triggers = {
					...(session.metadata.triggers ?? {}),
					onGainIncomeStep: {
						icon: '💰',
						future: 'During income collection',
						past: 'Income step',
					},
					onGainAPStep: {
						icon: '⚙️',
						future: 'During action preparation',
						past: 'Action point step',
					},
					onTestStep: {
						icon: '🧪',
						future: 'During test step',
						past: 'Test step',
					},
				};
				session.metadata.triggers = triggers;
				const firstPhase = session.phases[0];
				if (firstPhase) {
					const steps = [...(firstPhase.steps ?? [])];
					steps.push({
						id: 'phase.synthetic.test',
						title: 'Synthetic Test',
						triggers: ['onTestStep'],
					});
					firstPhase.steps = steps;
				}
			},
		);
		const stored = registries.developments.get(
			development.id,
		) as unknown as PhasedDef;
		const resourceKey =
			Object.keys(translationContext.assets.resources)[0] ?? 'resource.test';
		const makeEffect = (amount: number) => ({
			type: 'resource',
			method: 'add',
			params: { key: resourceKey, amount },
		});

		const triggerAssets = translationContext.assets.triggers;
		const stepKeys = Object.keys(triggerAssets).filter((key) =>
			key.endsWith('Step'),
		);

		expect(stepKeys).toContain('onTestStep');
		expect(stepKeys.some((key) => key !== 'onTestStep')).toBe(true);

		stepKeys.forEach((key, index) => {
			stored[key as keyof PhasedDef] = [makeEffect(index + 1)];
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
			const asset = triggerAssets[key] ?? {};
			const expectedTitle = [asset.icon, asset.future ?? asset.label ?? key]
				.filter((value) => typeof value === 'string' && value.length > 0)
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(translationContext, key);
			const resolvedTitle = stepLabel
				? [asset.icon, `During ${stepLabel}`]
						.filter((value) => typeof value === 'string' && value.length > 0)
						.join(' ')
						.trim()
				: expectedTitle;

			const summaryEntry =
				findEntry(summary, resolvedTitle) ?? findEntry(summary, expectedTitle);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();

			const describeEntry =
				findEntry(details, resolvedTitle) ?? findEntry(details, expectedTitle);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();
		}
	});
});
