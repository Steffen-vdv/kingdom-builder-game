import type { AttackPlayerDiff } from '@kingdom-builder/engine';
import { describe, expect, it } from 'vitest';

import { formatDiffCommon } from '../src/translation/effects/formatters/attack/shared';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import { DEFAULT_REGISTRY_METADATA } from '../src/contexts/defaultRegistryMetadata';
import type { TranslationContext } from '../src/translation/context';

const registries = createSessionRegistries();
const metadataSelectors = createTestRegistryMetadata(
        registries,
        DEFAULT_REGISTRY_METADATA,
);

const firstResourceDescriptor = metadataSelectors.resourceMetadata.list[0];
const firstStatDescriptor = metadataSelectors.statMetadata.list[0];

if (!firstResourceDescriptor || !firstStatDescriptor) {
        throw new Error('Registry metadata selectors did not provide default descriptors');
}

const translationContext = {
        assets: {
                resources: Object.fromEntries(
                        metadataSelectors.resourceMetadata.list.map((descriptor) => [
                                descriptor.id,
                                {
                                        icon: descriptor.icon,
                                        label: descriptor.label,
                                        description: descriptor.description,
                                },
                        ]),
                ),
                stats: Object.fromEntries(
                        metadataSelectors.statMetadata.list.map((descriptor) => [
                                descriptor.id,
                                {
                                        icon: descriptor.icon,
                                        label: descriptor.label,
                                        description: descriptor.description,
                                },
                        ]),
                ),
                populations: {},
                population: {},
                land: {},
                slot: {},
                passive: {},
                modifiers: {},
                formatPassiveRemoval: (description: string) =>
                        `Active as long as ${description}`,
        },
} as unknown as TranslationContext;

describe('attack diff formatters registry', () => {
        it('formats resource diffs using the registered formatter', () => {
                const resourceKey = firstResourceDescriptor.id;
                const resourceInfo = firstResourceDescriptor;
                const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
                        type: 'resource',
                        key: resourceKey,
                        before: 2,
                        after: 5,
                };

                const formatted = formatDiffCommon(
                        'Change',
                        diff,
                        translationContext,
                ) as unknown as string;

                expect(formatted.startsWith('Change:')).toBe(true);
                expect(formatted).toContain(resourceInfo.label ?? resourceKey);
                expect(formatted).toContain('+3');
        });

        it('formats stat diffs using the registered formatter', () => {
                const statKey = firstStatDescriptor.id;
                const statInfo = firstStatDescriptor;
                const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
                        type: 'stat',
                        key: statKey,
                        before: 4,
                        after: 9,
                };

                const formatted = formatDiffCommon(
                        'Update',
                        diff,
                        translationContext,
                ) as unknown as string;

                expect(formatted.startsWith('Update:')).toBe(true);
                expect(formatted).toContain(statInfo.label ?? statKey);
                expect(formatted).toContain('+5');
	});

	it('throws a clear error when a diff type has no registered formatter', () => {
		const unsupportedDiff = {
			type: 'unknown',
			key: 'mystery',
			before: 0,
			after: 1,
		} as unknown as AttackPlayerDiff;

		expect(() => formatDiffCommon('Oops', unsupportedDiff)).toThrow(
			/Unsupported attack diff type: unknown/,
		);
	});
});
