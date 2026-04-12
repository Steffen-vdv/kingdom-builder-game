/**
 * Content Package Loader
 *
 * Provides dynamic loading of content packages by ID.
 * Used by the engine/server to select game modes.
 */

import type { ContentPackage, ContentPackageLoader } from '@kingdom-builder/contents-sdk';

/**
 * Available content package IDs
 */
export const CONTENT_PACKAGE_IDS = ['kingdom-builder:base', 'kingdom-builder:dev-mode', 'kingdom-builder:tutorial', 'kingdom-builder:experimental'] as const;

export type ContentPackageId = (typeof CONTENT_PACKAGE_IDS)[number];

/**
 * Lightweight metadata for each content package.
 *
 * Used by the mode selection screen without loading full
 * packages. Keep in sync with factory return values.
 */
export interface ContentPackageMetaEntry {
	readonly id: ContentPackageId;
	readonly name: string;
	readonly description: string;
	readonly icon: string;
}

export const CONTENT_PACKAGE_META: readonly ContentPackageMetaEntry[] = [
	{
		id: 'kingdom-builder:base',
		name: 'Kingdom Builder',
		description: 'The full Kingdom Builder experience.',
		icon: '🏰',
	},
	{
		id: 'kingdom-builder:dev-mode',
		name: 'Dev Mode',
		description: 'Abundant starting resources for testing.',
		icon: '🧪',
	},
	{
		id: 'kingdom-builder:tutorial',
		name: 'Tutorial',
		description: 'Learn the basics with simplified gameplay.',
		icon: '📘',
	},
	{
		id: 'kingdom-builder:experimental',
		name: 'Experimental',
		description: 'Preview upcoming balance changes and features.',
		icon: '🔬',
	},
];

/**
 * Loads a content package by ID.
 * Uses dynamic imports for lazy loading.
 */
export async function loadContentPackage(contentId: string): Promise<ContentPackage> {
	switch (contentId) {
		case 'kingdom-builder:base': {
			const { createBasePackage } = await import('./base');
			return createBasePackage();
		}
		case 'kingdom-builder:dev-mode': {
			const { createDevModePackage } = await import('./dev-mode');
			return createDevModePackage();
		}
		case 'kingdom-builder:tutorial': {
			const { createTutorialPackage } = await import('./tutorial');
			return createTutorialPackage();
		}
		case 'kingdom-builder:experimental': {
			const { createExperimentalPackage } = await import('./experimental');
			return createExperimentalPackage();
		}
		default:
			throw new Error(`Unknown content package ID: ${contentId}`);
	}
}

/**
 * Creates a content package loader instance.
 */
export function createContentLoader(): ContentPackageLoader {
	return {
		load: loadContentPackage,
		list: () => [...CONTENT_PACKAGE_IDS],
	};
}

/**
 * Default content package ID for new games.
 */
export const DEFAULT_CONTENT_ID: ContentPackageId = 'kingdom-builder:experimental';
