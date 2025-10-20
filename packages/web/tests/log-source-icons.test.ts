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
import {
	selectPopulationDescriptor,
	selectResourceDescriptor,
} from '../src/translation/effects/registrySelectors';
import { ensureRequiredTranslationAssets } from './helpers/translationAssets';

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
	const resourceKeys = Object.keys(scaffold.registries.resources);
	const startResources = Object.fromEntries(
		resourceKeys.map((key) => [key, 0]),
	);
	const startConfig: StartConfig = {
		player: {
			resources: { ...startResources },
			stats: {},
			population: {},
			lands: [],
			buildings: [],
		},
		players: {
			opponent: {
				resources: { ...startResources },
				stats: {},
				population: {},
				lands: [],
				buildings: [],
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
	});
	const engineSnapshot = snapshotEngine(engine);
	engineSnapshot.metadata = ensureRequiredTranslationAssets(
		structuredClone(metadataOverride ?? scaffold.metadata),
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
	const populationDescriptor =
		metadataSelectors.populationMetadata.list.find((entry) => {
			return Boolean(entry.icon);
		}) ?? metadataSelectors.populationMetadata.list[0];
	if (!populationDescriptor) {
		throw new Error(
			'Expected at least one population descriptor for log source tests.',
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
		resourceKeys,
		populationId: populationDescriptor.id,
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
			name: 'population',
			buildMeta: (harness: LogHarness) => ({
				meta: {
					type: 'population' as const,
					id: harness.populationId,
					count: 2,
				},
				expected:
					selectPopulationDescriptor(
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
			const goldDescriptor =
				harness.metadataSelectors.resourceMetadata.list.find((entry) =>
					entry.label?.toLowerCase().includes('gold'),
				) ?? harness.metadataSelectors.resourceMetadata.list[0];
			if (!goldDescriptor) {
				throw new Error(
					'Expected at least one resource descriptor for log source tests.',
				);
			}
			const resourceKey = goldDescriptor.id;
			const effect = {
				type: 'resource' as const,
				method: 'add' as const,
				params: { key: resourceKey, amount: 2 },
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
			});
			const lines = diffStepSnapshots(before, after, step, diffContext, [
				resourceKey,
			]);
			const resourceInfo = selectResourceDescriptor(
				harness.translationContext,
				resourceKey,
			);
			const label = resourceInfo.label ?? resourceKey;
			const icon = resourceInfo.icon ?? '';
			const goldLine = lines.find((line) => {
				return line.startsWith(`${icon} ${label}`.trim());
			});
			expect(goldLine).toBeTruthy();
			const match = goldLine?.match(/ from (.+)\)$/u);
			expect(match?.[1]).toBe(expected);
		});
	}

	it('falls back to default source labels when metadata icons are missing', () => {
		const harness = createLogHarness(
			(() => {
				const original = createTestSessionScaffold().metadata;
				const clone = structuredClone(original);
				if (clone.assets?.land) {
					delete clone.assets.land.icon;
				}
				return clone;
			})(),
		);
		const diffContext = createTranslationDiffContext({
			activePlayer: harness.engine.activePlayer,
			buildings: harness.engine.buildings,
			developments: harness.engine.developments,
			passives: harness.translationContext.passives,
			assets: harness.translationContext.assets,
		});
		const effect = {
			type: 'resource' as const,
			method: 'add' as const,
			params: { key: harness.resourceKeys[0] ?? 'resource', amount: 1 },
			meta: { source: { type: 'land' as const } },
		};
		const before = captureActivePlayer(harness.engine);
		runEffects([effect], harness.engine);
		const after = captureActivePlayer(harness.engine);
		const lines = diffStepSnapshots(
			before,
			after,
			{ id: 'meta-icons-fallback', effects: [effect] },
			diffContext,
			[effect.params.key],
		);
		const landSource = harness.translationContext.assets.land.icon ?? '';
		const suffix = lines[0]?.match(/ from (.+)\)$/u)?.[1];
		expect(suffix).toBe(landSource);
	});
});
