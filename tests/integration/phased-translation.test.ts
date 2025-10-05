import { describe, it, expect, beforeAll, afterAll } from 'vitest';

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
	TRIGGER_INFO,
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
} from '../../packages/engine/tests/factories/content';
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

	beforeAll(() => {
		(TRIGGER_INFO as Record<string, typeof addedStep>)['onTestStep'] =
			addedStep;
	});

	afterAll(() => {
		delete (TRIGGER_INFO as Record<string, unknown>)['onTestStep'];
	});

	it('renders dynamic step metadata from trigger info', () => {
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

		const stepKeys = Object.keys(TRIGGER_INFO).filter((key) =>
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
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		const summary = summarizeContent(
			'development',
			development.id,
			ctx,
		) as unknown as Entry[];
		const details = describeContent(
			'development',
			development.id,
			ctx,
		) as unknown as Entry[];

		const info = TRIGGER_INFO as Record<
			string,
			{ icon: string; future: string }
		>;
		for (const key of stepKeys) {
			const expectedTitle = [info[key]?.icon, info[key]?.future]
				.filter(Boolean)
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(ctx, key);
			const resolvedTitle = stepLabel
				? [info[key]?.icon, `During ${stepLabel}`]
						.filter(Boolean)
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
