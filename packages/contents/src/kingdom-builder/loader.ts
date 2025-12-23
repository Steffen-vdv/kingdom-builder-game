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
export const CONTENT_PACKAGE_IDS = ['kingdom-builder:base', 'kingdom-builder:dev-mode', 'kingdom-builder:tutorial'] as const;

export type ContentPackageId = (typeof CONTENT_PACKAGE_IDS)[number];

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
export const DEFAULT_CONTENT_ID: ContentPackageId = 'kingdom-builder:base';
