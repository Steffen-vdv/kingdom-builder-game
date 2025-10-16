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
import { DEFAULT_TRIGGER_METADATA } from '@kingdom-builder/web/contexts/defaultRegistryMetadata';
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
	it('renders metadata-driven step triggers', () => {
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

		const metadata = (DEFAULT_TRIGGER_METADATA ?? {}) as Record<
			string,
			{
				icon?: string;
				future?: string;
				past?: string;
				label?: string;
			}
		>;
		const stepKeys = Object.keys(metadata).filter((key) =>
			key.endsWith('Step'),
		);

		expect(stepKeys.length).toBeGreaterThan(0);

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

		for (const key of stepKeys) {
			const entry = metadata[key] ?? {};
			const icon = (entry.icon ?? '').trim();
			const future = entry.future ?? entry.label ?? entry.past ?? key;
			const normalizedFuture =
				typeof future === 'string' ? future.trim().replace(/\s+/gu, ' ') : key;
			const expectedTitle = [icon.length ? icon : undefined, normalizedFuture]
				.filter((value) => typeof value === 'string')
				.join(' ')
				.trim();
			const stepLabel = formatStepTriggerLabel(ctx, key);
			const resolvedTitle = stepLabel
				? [icon.length ? icon : undefined, `During ${stepLabel}`]
						.filter((value) => typeof value === 'string')
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
