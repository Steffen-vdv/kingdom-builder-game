import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { createEngine } from '@kingdom-builder/engine';
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

			const summaryEntry = findEntry(summary, expectedTitle);
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();

			const describeEntry = findEntry(details, expectedTitle);
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();
		}
	});
});
