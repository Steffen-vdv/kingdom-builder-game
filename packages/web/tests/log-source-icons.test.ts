import { describe, expect, it } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import type { StartConfig } from '@kingdom-builder/protocol';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import { createTranslationContext } from '../src/translation/context';
import { snapshotEngine } from '../../engine/src/runtime/engine_snapshot';
import { snapshotPlayer as snapshotEnginePlayer } from '../../engine/src/runtime/player_snapshot';
import { selectResourceDescriptor } from '../src/translation/effects/registrySelectors';

interface LogHarness {
	engine: ReturnType<typeof createEngine>;
	translationContext: ReturnType<typeof createTranslationContext>;
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	resourceKeys: string[];
	populationId: string;
	developmentId: string;
	buildingId: string;
	landIcon: string;
}

function createLogHarness(
	metadataOverride?: Parameters<typeof createTranslationContext>[2],
): LogHarness {
	const scaffold = createTestSessionScaffold();
	// Use V2 resource IDs from the catalog for engine initialization
	const v2ResourceIds = Object.keys(
		scaffold.resourceCatalogV2.resources.byId ?? {},
	);
	const startValuesV2 = Object.fromEntries(v2ResourceIds.map((id) => [id, 0]));
	const startConfig: StartConfig = {
		player: {
			resources: {},
			stats: {},
			population: {},
			lands: [],
			buildings: [],
			valuesV2: { ...startValuesV2 },
		},
		players: {
			opponent: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				buildings: [],
				valuesV2: { ...startValuesV2 },
			},
		},
	} satisfies StartConfig;
	const engine = createEngine({
		actions: scaffold.registries.actions,
		buildings: scaffold.registries.buildings,
		developments: scaffold.registries.developments,
		populations: scaffold.registries.populations,
		phases: scaffold.phases.map((phase) => ({
			id: phase.id,
			action: phase.action ?? false,
			steps: (phase.steps ?? []).map((step) => ({ id: step.id })),
		})),
		start: startConfig,
		rules: scaffold.ruleSnapshot,
		resourceCatalogV2: scaffold.resourceCatalogV2,
	});
	const engineSnapshot = snapshotEngine(engine);
	engineSnapshot.metadata = structuredClone(
		metadataOverride ?? scaffold.metadata,
	);
	const translationContext = createTranslationContext(
		engineSnapshot,
		scaffold.registries,
		engineSnapshot.metadata,
		{
			ruleSnapshot: engineSnapshot.rules,
			passiveRecords: engineSnapshot.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		scaffold.registries,
		engineSnapshot.metadata,
	);
	engine.assets = translationContext.assets;
	// Find any grouped resource with an icon from V2 catalog
	// This tests population meta source rendering without hardcoding IDs
	const populationV2Resource = v2ResourceIds.find((id) => {
		const metadata = translationContext.resourceMetadataV2.get(id);
		return (
			metadata.groupId !== null &&
			metadata.groupId !== undefined &&
			Boolean(metadata.icon)
		);
	});
	if (!populationV2Resource) {
		throw new Error(
			'Expected at least one grouped resource with an icon in V2 catalog.',
		);
	}
	const developmentId = Array.from(engine.developments.keys()).find((id) => {
		return Boolean(translationContext.developments.get(id)?.icon);
	});
	if (!developmentId) {
		throw new Error(
			'Expected a development with an icon for log source tests.',
		);
	}
	const buildingId = Array.from(engine.buildings.keys()).find((id) => {
		return Boolean(translationContext.buildings.get(id)?.icon);
	});
	if (!buildingId) {
		throw new Error('Expected a building with an icon for log source tests.');
	}
	const landDescriptor = metadataSelectors.landMetadata.select();
	return {
		engine,
		translationContext,
		metadataSelectors,
		resourceKeys: v2ResourceIds,
		populationId: populationV2Resource,
		developmentId,
		buildingId,
		landIcon: landDescriptor.icon ?? '',
	};
}

function captureActivePlayer(engine: ReturnType<typeof createEngine>) {
	return snapshotPlayer(snapshotEnginePlayer(engine, engine.activePlayer));
}

describe('log resource source icon registry', () => {
	const scenarios = [
		{
			name: 'resource',
			buildMeta: (harness: LogHarness) => ({
				meta: {
					type: 'resource' as const,
					id: harness.populationId,
					count: 2,
				},
				expected:
					selectResourceDescriptor(
						harness.translationContext,
						harness.populationId,
					).icon?.repeat(2) ?? '',
			}),
		},
		{
			name: 'development',
			buildMeta: (harness: LogHarness) => ({
				meta: {
					type: 'development' as const,
					id: harness.developmentId,
				},
				expected:
					harness.translationContext.developments.get(harness.developmentId)
						?.icon || '',
			}),
		},
		{
			name: 'building',
			buildMeta: (harness: LogHarness) => ({
				meta: { type: 'building' as const, id: harness.buildingId },
				expected:
					harness.translationContext.buildings.get(harness.buildingId)?.icon ||
					'',
			}),
		},
		{
			name: 'land',
			buildMeta: (harness: LogHarness) => ({
				meta: { type: 'land' as const },
				expected: harness.landIcon,
			}),
		},
	] as const;

	for (const { name, buildMeta } of scenarios) {
		it(`renders icons for ${name} meta sources`, () => {
			const harness = createLogHarness();
			const { meta, expected } = buildMeta(harness);
			// Find gold resource from V2 catalog
			const goldResourceId =
				harness.resourceKeys.find((id) => id.includes('gold')) ??
				harness.resourceKeys[0];
			if (!goldResourceId) {
				throw new Error(
					'Expected at least one resource descriptor for log source tests.',
				);
			}
			// Use V2 effect format with resourceId and change object
			const effect = {
				type: 'resource' as const,
				method: 'add' as const,
				params: {
					resourceId: goldResourceId,
					change: { type: 'amount' as const, amount: 2 },
				},
				meta: { source: meta },
			};
			const step = { id: `meta-icons-${name}`, effects: [effect] };
			const before = captureActivePlayer(harness.engine);
			runEffects([effect], harness.engine);
			const after = captureActivePlayer(harness.engine);
			const diffContext = createTranslationDiffContext({
				activePlayer: harness.engine.activePlayer,
				buildings: harness.engine.buildings,
				developments: harness.engine.developments,
				passives: harness.translationContext.passives,
				assets: harness.translationContext.assets,
				actionCategories: harness.translationContext.actionCategories,
				resourceMetadataV2: harness.translationContext.resourceMetadataV2,
			});
			const diffResult = diffStepSnapshots(before, after, step, diffContext, [
				goldResourceId,
			]);
			const lines = diffResult.summaries;
			const resourceInfo = selectResourceDescriptor(
				harness.translationContext,
				goldResourceId,
			);
			const label = resourceInfo.label ?? goldResourceId;
			const icon = resourceInfo.icon ?? '';
			const goldLine = lines.find((line) => {
				return line.startsWith(`${icon} ${label}`.trim());
			});
			expect(goldLine).toBeTruthy();
			const match = goldLine?.match(/ from (.+)\)$/u);
			expect(match?.[1]).toBe(expected);
		});
	}

	it('throws when land metadata descriptor is removed', () => {
		const scaffold = createTestSessionScaffold();
		const clone = structuredClone(scaffold.metadata);
		if (clone.assets) {
			delete clone.assets.land;
		}
		// The harness throws when the land metadata selector cannot find the
		// required land descriptor in session assets
		expect(() => createLogHarness(clone)).toThrowError(/land|assets|metadata/i);
	});
});
