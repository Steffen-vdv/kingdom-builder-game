/**
 * ContentPackage interface - defines the contract for game content packages.
 *
 * Each game mode (base, dev-mode, tutorial) exports a ContentPackage.
 * The engine/server loads the appropriate package based on contentId.
 */

import type {
	Registry,
	ActionMetaCategoryConfig,
	PhaseConfig,
	RuleSet,
} from '@kingdom-builder/protocol';
import type { ActionDef, BuildingDef, DevelopmentDef } from './defs';
import type { ActionCategoryConfig } from '../builders/builders';

/**
 * Resource catalog containing all resource-related registries.
 * Uses flexible types to accommodate different resource catalog
 * implementations.
 */
export interface ResourceCatalog {
	readonly resources: {
		readonly byId: Record<string, unknown>;
		readonly ordered: readonly unknown[];
	};
	readonly groups: {
		readonly byId: Record<string, unknown>;
		readonly ordered?: readonly unknown[];
	};
	readonly categories?: {
		readonly byId: Record<string, unknown>;
		readonly ordered?: readonly unknown[];
	};
}

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

	/** Action meta-category definitions registry */
	readonly actionMetaCategories: Registry<ActionMetaCategoryConfig>;

	/** Action category definitions registry */
	readonly actionCategories: Registry<ActionCategoryConfig>;

	/** Building definitions registry */
	readonly buildings: Registry<BuildingDef>;

	/** Development definitions registry */
	readonly developments: Registry<DevelopmentDef>;

	/** Resource catalog with resources, groups, and categories */
	readonly resourceCatalog: ResourceCatalog;

	/** Game rules configuration */
	readonly rules: RuleSet;

	/** Phase configuration */
	readonly phases: readonly PhaseConfig[];

	/** Primary icon ID for this content package */
	readonly primaryIconId?: string;
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
