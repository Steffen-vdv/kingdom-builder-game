import { describe, it, expect } from 'vitest';

import { createEngine } from '@kingdom-builder/engine';
import {
	summarizeContent,
	describeContent,
} from '@kingdom-builder/web/translation/content';
// prettier-ignore
import type {
        PhasedDef,
} from '@kingdom-builder/web/translation/content/phased';
import { PHASES, GAME_START, RULES } from '@kingdom-builder/contents';
// prettier-ignore
import {
        createContentFactory,
} from '@kingdom-builder/testing';
import type { SessionTriggerMetadata } from '@kingdom-builder/protocol/session';
import type { TranslationContext } from '@kingdom-builder/web/translation/context';
import { createTranslationContextForEngine } from '../../packages/web/tests/helpers/createTranslationContextForEngine';
import { createResourceKeys } from '../../packages/web/tests/helpers/sessionRegistries';
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
	it('renders dynamic step metadata from trigger assets', () => {
		const content = createContentFactory();
		const development = content.development();
		const stored = content.developments.get(
			development.id,
		) as unknown as PhasedDef;

		const [resourceKey] = createResourceKeys();
		if (!resourceKey) {
			throw new Error('Expected at least one resource key for test fixtures.');
		}
		const makeEffect = (amount: number) => ({
			type: 'resource',
			method: 'add',
			params: { key: resourceKey, amount },
		});

		const triggerMetadata: Record<string, SessionTriggerMetadata> = {
			onGainIncomeStep: {
				icon: '💰',
				future: 'During the Gain Income step',
				past: 'Gain Income step',
			},
			onGainAPStep: {
				icon: '⚡',
				future: 'During the Gain AP step',
				past: 'Gain AP step',
			},
			onTestStep: {
				icon: '🧪',
				future: 'During the Research step',
				past: 'Research step',
			},
		};

		const stepKeys = Object.keys(triggerMetadata).filter((key) =>
			key.endsWith('Step'),
		);

		expect(stepKeys).toContain('onTestStep');
		expect(stepKeys.some((key) => key !== 'onTestStep')).toBe(true);

		stepKeys.forEach((key, index) => {
			stored[key as keyof PhasedDef] = [makeEffect(index + 1)];
		});

		const ctx = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: content.populations,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		const translation = createTranslationContextForEngine(ctx, {
			configureRegistries(registries) {
				registries.developments.add(development.id, development);
			},
			configureSnapshot(snapshot) {
				const [firstPhase] = snapshot.phases;
				if (!firstPhase) {
					return;
				}
				const existingSteps = firstPhase.steps ?? [];
				firstPhase.steps = [
					...existingSteps,
					{
						id: 'custom-research',
						title: 'Research step',
						icon: '🧪',
						triggers: ['onTestStep'],
					},
				];
			},
			configureMetadata(metadata) {
				return {
					...metadata,
					triggers: { ...triggerMetadata },
				};
			},
		});

		const summary = summarizeContent(
			'development',
			development.id,
			translation,
		) as unknown as Entry[];
		const details = describeContent(
			'development',
			development.id,
			translation,
		) as unknown as Entry[];

		for (const key of stepKeys) {
			const info = triggerMetadata[key];
			const defaultTitle = [info?.icon, info?.future ?? info?.past ?? key]
				.filter(Boolean)
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(translation, key);
			const resolvedTitle = stepLabel
				? [info?.icon, `During ${stepLabel}`].filter(Boolean).join(' ').trim()
				: defaultTitle;

			const summaryEntry =
				findEntry(summary, resolvedTitle) ?? findEntry(summary, defaultTitle);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();

			const describeEntry =
				findEntry(details, resolvedTitle) ?? findEntry(details, defaultTitle);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();
		}
	});
});
