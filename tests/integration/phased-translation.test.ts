import { describe, it, expect } from 'vitest';

import {
	summarizeContent,
	describeContent,
} from '@kingdom-builder/web/translation/content';
// prettier-ignore
import type {
        PhasedDef,
} from '@kingdom-builder/web/translation/content/phased';
import { resolvePhasedTriggerTitle } from '@kingdom-builder/web/translation/content/phased';
// prettier-ignore
import {
        createContentFactory,
} from '@kingdom-builder/testing';
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

describe('PhasedTranslator step triggers', () => {
	it('renders dynamic step metadata from trigger info', () => {
		const content = createContentFactory();
		const stepMetadata = {
			onTestStep: {
				icon: '🧪',
				label: 'Test step',
				text: 'During test step',
			},
			onWorkshopStep: {
				icon: '⚙️',
				label: 'Workshop step',
				text: 'During workshop step',
			},
		} as const;
		let developmentId = '';
		let stepKeys: string[] = [];

		const { translationContext } = buildSyntheticTranslationContext(
			({ registries, session }) => {
				const development = content.development();
				developmentId = development.id;
				registries.developments.add(development.id, development);
				const stored = registries.developments.get(
					development.id,
				) as unknown as PhasedDef;

				const resourceKeys = Object.keys(registries.resources);
				const resourceKey = resourceKeys[0] ?? 'resource.synthetic';
				const makeEffect = (amount: number) => ({
					type: 'resource',
					method: 'add',
					params: {
						resourceId: resourceKey,
						change: { type: 'amount', amount },
					},
				});

				session.metadata = {
					...session.metadata,
					triggers: {
						...(session.metadata.triggers ?? {}),
						...stepMetadata,
					},
				};

				const targetPhase = session.phases[0];
				if (targetPhase) {
					const existingSteps = targetPhase.steps ?? [];
					targetPhase.steps = [
						...existingSteps,
						{
							id: 'phase.synthetic.translation',
							title: 'Synthetic Translation',
							icon: '🧪',
							triggers: Object.keys(stepMetadata),
						},
					];
				}

				stepKeys = Object.keys(stepMetadata);
				stepKeys.forEach((key, index) => {
					stored[key as keyof PhasedDef] = [makeEffect(index + 1)];
				});
			},
		);

		expect(stepKeys).toHaveLength(2);

		const summary = summarizeContent(
			'development',
			developmentId,
			translationContext,
		) as unknown as Entry[];
		const details = describeContent(
			'development',
			developmentId,
			translationContext,
		) as unknown as Entry[];

		for (const key of stepKeys) {
			const expectedTitle = resolvePhasedTriggerTitle(
				translationContext,
				key,
				key,
			);
			expect(expectedTitle, `expected title for ${key}`).toBeTruthy();
			const summaryEntry = expectedTitle
				? findEntry(summary, expectedTitle)
				: undefined;
			expect(summaryEntry, `summary entry for ${key}`).toBeDefined();

			const describeEntry = expectedTitle
				? findEntry(details, expectedTitle)
				: undefined;
			expect(describeEntry, `describe entry for ${key}`).toBeDefined();

			expect(describeEntry?.title).toBe(summaryEntry?.title);
		}
	});
});
