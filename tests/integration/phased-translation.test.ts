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
import { buildSyntheticTranslationContext } from '../../packages/web/tests/helpers/createSyntheticTranslationContext';

type Entry = string | { title: string; items: Entry[] };

/**
 * Checks if any entry contains the given phase suffix.
 * After the inline format change, step triggers produce effects like:
 * "🪙 +1 per 🧪 Phase Label Phase" instead of section groups.
 */
function hasEntryWithPhaseSuffix(
	entries: Entry[],
	phaseSuffix: string,
): boolean {
	for (const entry of entries) {
		if (typeof entry === 'string') {
			if (entry.includes(phaseSuffix)) {
				return true;
			}
			continue;
		}
		if (entry.title.includes(phaseSuffix)) {
			return true;
		}
		if (hasEntryWithPhaseSuffix(entry.items, phaseSuffix)) {
			return true;
		}
	}
	return false;
}

describe('PhasedTranslator step triggers', () => {
	it('renders dynamic step metadata with inline phase suffix', () => {
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
		let phaseLabel = '';

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
					phaseLabel = targetPhase.label ?? targetPhase.id;
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

				const stepKeys = Object.keys(stepMetadata);
				stepKeys.forEach((key, index) => {
					stored[key as keyof PhasedDef] = [makeEffect(index + 1)];
				});
			},
		);

		expect(phaseLabel).toBeTruthy();

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

		// Step triggers now produce inline phase suffixes like "per 🌱 Growth Phase"
		// instead of section grouping with titles.
		const expectedPhaseSuffix = `${phaseLabel} Phase`;

		expect(
			hasEntryWithPhaseSuffix(summary, expectedPhaseSuffix),
			`summary should contain phase suffix "${expectedPhaseSuffix}"`,
		).toBe(true);
		expect(
			hasEntryWithPhaseSuffix(details, expectedPhaseSuffix),
			`describe should contain phase suffix "${expectedPhaseSuffix}"`,
		).toBe(true);
	});
});
