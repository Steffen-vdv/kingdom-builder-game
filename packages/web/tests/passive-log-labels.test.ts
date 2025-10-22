import { describe, expect, it, vi } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';
import { logContent } from '../src/translation/content';
import { LOG_KEYWORDS } from '../src/translation/log/logMessages';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createTranslationContext } from '../src/translation/context';
import { snapshotEngine } from '../../engine/src/runtime/engine_snapshot';
import { snapshotPlayer as snapshotEnginePlayer } from '../../engine/src/runtime/player_snapshot';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import {
	selectPassiveDescriptor,
	selectResourceDescriptor,
	selectStatDescriptor,
} from '../src/translation/effects/registrySelectors';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

type ScaffoldData = ReturnType<typeof createTestSessionScaffold>;

interface PassiveHarness {
	engine: ReturnType<typeof createEngine>;
	translationContext: ReturnType<typeof createTranslationContext>;
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	ruleSnapshot: ScaffoldData['ruleSnapshot'];
	registries: ScaffoldData['registries'];
	sessionMetadata: ScaffoldData['metadata'];
}

function createPassiveHarness(
	metadataOverride?: Parameters<typeof createTranslationContext>[2],
): PassiveHarness {
	const scaffold = createTestSessionScaffold();
	const resourceKeys = Object.keys(scaffold.registries.resources);
	const startResources = Object.fromEntries(
		resourceKeys.map((key) => [key, 0]),
	);
	const startConfig = {
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
	} satisfies Parameters<typeof createEngine>[0]['start'];
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
	const snapshot = snapshotEngine(engine);
	const appliedMetadata = structuredClone(
		metadataOverride ?? scaffold.metadata,
	);
	snapshot.metadata = appliedMetadata;
	const translationContext = createTranslationContext(
		snapshot,
		scaffold.registries,
		snapshot.metadata,
		{
			ruleSnapshot: snapshot.rules,
			passiveRecords: snapshot.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		scaffold.registries,
		snapshot.metadata,
	);
	engine.assets = translationContext.assets;
	return {
		engine,
		translationContext,
		metadataSelectors,
		ruleSnapshot: snapshot.rules,
		registries: scaffold.registries,
		sessionMetadata: appliedMetadata,
	};
}

function captureActivePlayer(engine: ReturnType<typeof createEngine>) {
	return snapshotPlayer(snapshotEnginePlayer(engine, engine.activePlayer));
}

function rebuildTranslationArtifacts(harness: PassiveHarness) {
	const snapshot = snapshotEngine(harness.engine);
	snapshot.metadata = structuredClone(harness.sessionMetadata);
	const translationContext = createTranslationContext(
		snapshot,
		harness.registries,
		snapshot.metadata,
		{
			ruleSnapshot: snapshot.rules,
			passiveRecords: snapshot.passiveRecords,
		},
	);
	const diffContext = createTranslationDiffContext({
		activePlayer: harness.engine.activePlayer,
		buildings: harness.engine.buildings,
		developments: harness.engine.developments,
		passives: translationContext.passives,
		assets: translationContext.assets,
	});
	return { translationContext, diffContext } as const;
}

function renderEmptySlotLabel(slot: { icon?: string; label?: string }): string {
	const slotIcon = slot.icon?.trim() ?? '';
	const baseSlotLabel = slot.label?.trim() ?? 'Development Slot';
	const hasEmptyPrefix = /(?:^|\s)empty\b/i.test(baseSlotLabel);
	const emptySlotLabel = hasEmptyPrefix
		? baseSlotLabel
		: `Empty ${baseSlotLabel}`.trim();
	const slotDisplay = [slotIcon, emptySlotLabel]
		.filter((segment) => segment.length > 0)
		.join(' ')
		.replace(/\s{2,}/g, ' ')
		.trim();
	return slotDisplay || 'Empty Development Slot';
}

function findBuildingId(
	registries: PassiveHarness['registries'],
	segment: string,
) {
	for (const [id] of registries.buildings.entries()) {
		if (id.includes(segment)) {
			return id;
		}
	}
	throw new Error(`Unable to find building containing segment "${segment}".`);
}

function findDevelopmentId(
	registries: PassiveHarness['registries'],
	segment: string,
) {
	for (const [id] of registries.developments.entries()) {
		if (id.includes(segment)) {
			return id;
		}
	}
	throw new Error(
		`Unable to find development containing segment "${segment}".`,
	);
}

describe('passive log labels', () => {
	it('uses tier summary tokens without exposing raw ids', () => {
		const harness = createPassiveHarness();
		const happinessKey = harness.ruleSnapshot.tieredResourceKey;
		const setHappiness = (value: number) => {
			const { engine } = harness;
			engine.activePlayer.resources[happinessKey] = value;
			engine.services.handleTieredResourceChange(
				engine,
				engine.activePlayer,
				happinessKey,
			);
		};
		setHappiness(0);
		const beforeActivation = captureActivePlayer(harness.engine);
		setHappiness(6);
		const afterActivation = captureActivePlayer(harness.engine);
		const { translationContext, diffContext } =
			rebuildTranslationArtifacts(harness);
		const tierDescriptor = selectResourceDescriptor(
			translationContext,
			happinessKey,
		);
		const activationDiff = diffStepSnapshots(
			beforeActivation,
			afterActivation,
			undefined,
			diffContext,
		);
		const activationLines = activationDiff.summaries;
		expect(activationLines.length).toBeGreaterThan(0);
		const tierIncreaseLine = activationLines.find((line) =>
			line.includes(tierDescriptor.label),
		);
		expect(tierIncreaseLine).toBeTruthy();
		expect(tierIncreaseLine?.includes(happinessKey)).toBe(false);
		if (tierDescriptor.icon) {
			expect(tierIncreaseLine?.startsWith(`${tierDescriptor.icon} `)).toBe(
				true,
			);
		} else {
			expect(tierIncreaseLine?.startsWith('undefined')).toBe(false);
		}
		const beforeExpiration = captureActivePlayer(harness.engine);
		setHappiness(0);
		const afterExpiration = captureActivePlayer(harness.engine);
		const {
			translationContext: expirationContext,
			diffContext: expirationDiffContext,
		} = rebuildTranslationArtifacts(harness);
		const expirationDescriptor = selectResourceDescriptor(
			expirationContext,
			happinessKey,
		);
		const expirationResult = diffStepSnapshots(
			beforeExpiration,
			afterExpiration,
			undefined,
			expirationDiffContext,
		);
		const expirationLines = expirationResult.summaries;
		const tierDecreaseLine = expirationLines.find((line) =>
			line.includes(expirationDescriptor.label),
		);
		expect(tierDecreaseLine).toBeTruthy();
		expect(tierDecreaseLine?.includes(happinessKey)).toBe(false);
		if (expirationDescriptor.icon) {
			expect(
				tierDecreaseLine?.startsWith(`${expirationDescriptor.icon} `),
			).toBe(true);
		} else {
			expect(tierDecreaseLine?.startsWith('undefined')).toBe(false);
		}
		const passiveDescriptor = selectPassiveDescriptor(expirationContext);
		expect(passiveDescriptor.label.length).toBeGreaterThan(0);
	});

	it('formats building passives and skips bonus activations', () => {
		const harness = createPassiveHarness();
		const castleWallsId = findBuildingId(harness.registries, 'castle_walls');
		const before = captureActivePlayer(harness.engine);
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: castleWallsId },
				},
			],
			harness.engine,
		);
		const after = captureActivePlayer(harness.engine);
		const { translationContext, diffContext } =
			rebuildTranslationArtifacts(harness);
		const diffResult = diffStepSnapshots(before, after, undefined, diffContext);
		const lines = diffResult.summaries;
		expect(lines.some((line) => line.includes('activated'))).toBe(false);
		const buildingEntry = translationContext.buildings.get(castleWallsId);
		const buildingLabel = buildingEntry?.name ?? castleWallsId;
		const iconPrefix = buildingEntry?.icon ? `${buildingEntry.icon} ` : '';
		expect(
			lines.some((line) =>
				line.startsWith(`${LOG_KEYWORDS.built} ${iconPrefix}${buildingLabel}`),
			),
		).toBe(true);
		expect(lines.some((line) => line.includes('castle_walls_bonus'))).toBe(
			false,
		);
	});

	it('omits development passives and keeps stat changes grouped', () => {
		const harness = createPassiveHarness();
		runEffects(
			[
				{
					type: 'land',
					method: 'add',
				},
			],
			harness.engine,
		);
		const targetLand = harness.engine.activePlayer.lands.at(-1);
		expect(targetLand).toBeTruthy();
		if (!targetLand) {
			return;
		}
		const developmentId = findDevelopmentId(harness.registries, 'watchtower');
		const before = captureActivePlayer(harness.engine);
		runEffects(
			[
				{
					type: 'development',
					method: 'add',
					params: { id: developmentId, landId: targetLand.id },
				},
			],
			harness.engine,
		);
		const after = captureActivePlayer(harness.engine);
		const { translationContext, diffContext } =
			rebuildTranslationArtifacts(harness);
		const slotLabel = renderEmptySlotLabel(translationContext.assets.slot);
		const diffResult = diffStepSnapshots(before, after, undefined, diffContext);
		const lines = diffResult.summaries;
		expect(lines.some((line) => line.includes('activated'))).toBe(false);
		const rawLabel = logContent(
			'development',
			developmentId,
			harness.engine,
		)[0];
		const label =
			rawLabel && typeof rawLabel === 'object'
				? rawLabel.text
				: (rawLabel ?? developmentId);
		const expectedHeadline = `${LOG_KEYWORDS.developed} ${label} on ${slotLabel}`;
		expect(lines).toContain(expectedHeadline);
		const fortificationKey =
			harness.metadataSelectors.statMetadata.list.find((descriptor) =>
				descriptor.id.includes('fortification'),
			)?.id ?? 'fortificationStrength';
		const fortification = selectStatDescriptor(
			translationContext,
			fortificationKey,
		);
		expect(
			lines.some(
				(line) =>
					line.includes(fortification.label ?? 'Fortification') &&
					line.includes('+2'),
			),
		).toBe(true);
		const absorptionDescriptor =
			harness.metadataSelectors.statMetadata.list.find((descriptor) =>
				descriptor.label?.toLowerCase().includes('absorption'),
			);
		const absorptionLabel = absorptionDescriptor?.label ?? 'Absorption';
		expect(
			lines.some(
				(line) => line.includes(absorptionLabel) && line.includes('+50%'),
			),
		).toBe(true);
	});

	it('falls back when passive icon metadata is missing', () => {
		const metadataOverride = structuredClone(
			createTestSessionScaffold().metadata,
		);
		if (metadataOverride.assets?.passive) {
			delete metadataOverride.assets.passive.icon;
		}
		const harness = createPassiveHarness(metadataOverride);
		const happinessKey = harness.ruleSnapshot.tieredResourceKey;
		harness.engine.activePlayer.resources[happinessKey] = 0;
		harness.engine.services.handleTieredResourceChange(
			harness.engine,
			harness.engine.activePlayer,
			happinessKey,
		);
		harness.engine.activePlayer.resources[happinessKey] = 6;
		harness.engine.services.handleTieredResourceChange(
			harness.engine,
			harness.engine.activePlayer,
			happinessKey,
		);
		const before = captureActivePlayer(harness.engine);
		harness.engine.activePlayer.resources[happinessKey] = 0;
		harness.engine.services.handleTieredResourceChange(
			harness.engine,
			harness.engine.activePlayer,
			happinessKey,
		);
		const after = captureActivePlayer(harness.engine);
		const { translationContext, diffContext } =
			rebuildTranslationArtifacts(harness);
		const descriptor = selectResourceDescriptor(
			translationContext,
			happinessKey,
		);
		const diffResult = diffStepSnapshots(before, after, undefined, diffContext);
		const lines = diffResult.summaries;
		const tierChangeLine = lines.find(
			(line) => line.includes(descriptor.label) && line.includes('→'),
		);
		expect(tierChangeLine).toBeTruthy();
		expect(tierChangeLine?.includes(happinessKey)).toBe(false);
		expect(tierChangeLine?.startsWith('undefined')).toBe(false);
		const passiveDescriptor = selectPassiveDescriptor(translationContext);
		expect(passiveDescriptor.icon).toBe('♾️');
	});
});
