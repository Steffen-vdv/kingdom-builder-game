/**
 * ContentPackage interface - defines the contract for game content packages.
 *
 * Each game mode (base, dev-mode, tutorial) exports a ContentPackage.
 * The engine/server loads the appropriate package based on contentId.
 */

import type { Registry } from '@kingdom-builder/protocol';
import type { ActionDef, BuildingDef, DevelopmentDef } from './defs';

/**
 * A content package contains all the game content for a specific mode.
 * Games can extend base packages by importing and modifying their content.
 */
export interface ContentPackage {
	/** Unique identifier for this content package */
	readonly id: string;

	/** Human-readable name for display purposes */
	readonly name: string;

	/** Optional description of this content package */
	readonly description?: string;

	/** Action definitions registry */
	readonly actions: Registry<ActionDef>;

	/** Building definitions registry */
	readonly buildings: Registry<BuildingDef>;

	/** Development definitions registry */
	readonly developments: Registry<DevelopmentDef>;

	/**
	 * Resource definitions - games define their own resource structure.
	 * The SDK doesn't prescribe the exact shape, allowing flexibility.
	 */
	readonly resources: unknown;

	/**
	 * Game rules configuration.
	 * The SDK doesn't prescribe the exact shape, allowing flexibility.
	 */
	readonly rules: unknown;

	/**
	 * Phase configuration.
	 * The SDK doesn't prescribe the exact shape, allowing flexibility.
	 */
	readonly phases: unknown;

	/**
	 * Start configuration for new games.
	 */
	readonly startConfig: unknown;

	/**
	 * Win conditions configuration.
	 */
	readonly winConditions?: unknown;
}

/**
 * Factory function type for creating content packages.
 * This allows lazy loading and modification of content.
 */
export type ContentPackageFactory = () => ContentPackage;

/**
 * Content package loader result.
 */
export interface ContentPackageLoader {
	/** Load a content package by ID */
	load(contentId: string): Promise<ContentPackage>;

	/** List available content package IDs */
	list(): string[];
}
