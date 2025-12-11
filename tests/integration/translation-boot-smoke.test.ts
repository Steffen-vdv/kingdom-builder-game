/**
 * Boot smoke tests for translation layer.
 *
 * These tests use REAL content from @kingdom-builder/contents and REAL metadata
 * building from the server to ensure the translation layer doesn't crash on
 * boot. This catches mismatches where the web layer expects fields that the
 * server doesn't provide.
 *
 * If any of these tests fail, the game will crash on load.
 */
import { describe, expect, it } from 'vitest';
import {
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	RESOURCE_REGISTRY,
	createBuildingRegistry,
	createDevelopmentRegistry,
} from '@kingdom-builder/contents';
import { buildSessionMetadata } from '../../packages/server/src/session/buildSessionMetadata';
import { createTranslationAssets } from '../../packages/web/src/translation/context/assets';
import {
	selectActionDescriptor,
	selectDevelopmentDescriptor,
	selectKeywordLabels,
	selectModifierInfo,
	selectPassiveDescriptor,
	selectTransferDescriptor,
} from '../../packages/web/src/translation/effects/registrySelectors';
import type { SessionRuleSnapshot } from '@kingdom-builder/protocol';

/**
 * Build real session metadata using the actual server function with real
 * content from @kingdom-builder/contents. This is what the client receives.
 */
function buildRealMetadata() {
	const buildings = createBuildingRegistry(BUILDINGS);
	const developments = createDevelopmentRegistry(DEVELOPMENTS);
	// Convert resource registry to the expected format
	const resources: Record<
		string,
		{ label?: string; icon?: string; description?: string | null }
	> = {};
	for (const [id, def] of Object.entries(RESOURCE_REGISTRY.byId)) {
		resources[id] = {
			label: def.label,
			icon: def.icon,
			description: def.description,
		};
	}
	return buildSessionMetadata({
		buildings,
		developments,
		resources,
		phases: PHASES,
	});
}

/**
 * Creates a minimal context-like object with real metadata assets.
 * This simulates what the web client receives from the server.
 */
function createRealAssetContext() {
	const metadata = buildRealMetadata();
	const ruleSnapshot: SessionRuleSnapshot = {
		tieredResourceKey: 'resource:core:happiness',
		tierDefinitions: [],
		winConditions: [],
	};
	const resources: Record<string, { icon?: string; label?: string }> = {};
	for (const [id, def] of Object.entries(RESOURCE_REGISTRY.byId)) {
		resources[id] = { icon: def.icon, label: def.label };
	}
	const assets = createTranslationAssets({ resources }, metadata, {
		rules: ruleSnapshot,
	});
	return { assets };
}

describe('translation boot smoke tests', () => {
	it("doesn't blatantly crash on boot - assets creation", () => {
		// This test uses REAL content and REAL server metadata
		// If this fails, the game crashes on load
		expect(() => createRealAssetContext()).not.toThrow();
	});

	it('can access all required keyword descriptors without throwing', () => {
		const context = createRealAssetContext();

		// These selectors throw if required fields are missing
		expect(() => selectActionDescriptor(context)).not.toThrow();
		expect(() => selectDevelopmentDescriptor(context)).not.toThrow();
		expect(() => selectKeywordLabels(context)).not.toThrow();
		expect(() => selectModifierInfo(context, 'cost')).not.toThrow();
		expect(() => selectModifierInfo(context, 'result')).not.toThrow();
		expect(() => selectPassiveDescriptor(context)).not.toThrow();
		expect(() => selectTransferDescriptor(context)).not.toThrow();
	});

	it('returns complete action descriptor with plural', () => {
		const context = createRealAssetContext();
		const action = selectActionDescriptor(context);

		expect(action.icon).toBeTruthy();
		expect(action.label).toBeTruthy();
		expect(action.plural).toBeTruthy();
	});

	it('returns complete development descriptor with plural', () => {
		const context = createRealAssetContext();
		const development = selectDevelopmentDescriptor(context);

		expect(development.icon).toBeTruthy();
		expect(development.label).toBeTruthy();
		expect(development.plural).toBeTruthy();
	});

	it('returns complete keyword labels', () => {
		const context = createRealAssetContext();
		const keywords = selectKeywordLabels(context);

		expect(keywords.resourceGain).toBeTruthy();
		expect(keywords.cost).toBeTruthy();
	});

	it('server buildSessionMetadata includes all required asset fields', () => {
		const metadata = buildRealMetadata();

		// Verify all required assets are present
		expect(metadata.assets).toBeDefined();
		expect(metadata.assets?.action).toBeDefined();
		expect(metadata.assets?.development).toBeDefined();
		expect(metadata.assets?.modifiers).toBeDefined();
		expect(metadata.assets?.keywords).toBeDefined();
		expect(metadata.assets?.passive).toBeDefined();
		expect(metadata.assets?.transfer).toBeDefined();
		expect(metadata.assets?.land).toBeDefined();
		expect(metadata.assets?.slot).toBeDefined();
		expect(metadata.assets?.population).toBeDefined();
		expect(metadata.assets?.upkeep).toBeDefined();
	});

	it('server buildSessionMetadata includes plural for action/development', () => {
		const metadata = buildRealMetadata();

		// This is the specific bug that caused the crash - plural was missing
		const actionAsset = metadata.assets?.action as
			| { icon?: string; label?: string; plural?: string }
			| undefined;
		const devAsset = metadata.assets?.development as
			| { icon?: string; label?: string; plural?: string }
			| undefined;

		expect(actionAsset?.icon).toBeTruthy();
		expect(actionAsset?.label).toBeTruthy();
		expect(actionAsset?.plural).toBeTruthy();

		expect(devAsset?.icon).toBeTruthy();
		expect(devAsset?.label).toBeTruthy();
		expect(devAsset?.plural).toBeTruthy();
	});

	it('server buildSessionMetadata includes keyword labels', () => {
		const metadata = buildRealMetadata();

		const keywords = metadata.assets?.keywords as
			| { resourceGain?: string; cost?: string }
			| undefined;

		expect(keywords?.resourceGain).toBeTruthy();
		expect(keywords?.cost).toBeTruthy();
	});
});
