import { describe, expect, it, vi } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';
import { logContent } from '../src/translation/content';
import { LOG_KEYWORDS } from '../src/translation/log/logMessages';
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createTranslationEnvironmentFromEngine } from './helpers/createTranslationEnvironment';
import { createPassiveRecord } from './helpers/sessionFixtures';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';

function createPassiveLogEnvironment() {
	const registries = createSessionRegistries();
	const resourceEntries = Object.entries(registries.resources);
	const happinessEntry = resourceEntries.find(
		([, def]) => def.label === 'Happiness',
	);
	const happinessKey =
		happinessEntry?.[0] ?? resourceEntries[0]?.[0] ?? 'resource:happiness';
	const phases: PhaseConfig[] = [
		{ id: 'phase:growth', label: 'Growth', action: false, steps: [] },
		{ id: 'phase:upkeep', label: 'Upkeep', action: false, steps: [] },
	];
	const start: StartConfig = {
		player: {
			resources: { [happinessKey]: 0 },
			stats: {},
			population: {},
			lands: [],
			buildings: [],
		},
		players: {
			opponent: {
				resources: {},
				stats: {},
				population: {},
				lands: [],
				buildings: [],
			},
		},
	};
	const rules: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'nearest',
		tieredResourceKey: happinessKey,
		tierDefinitions: [
			{
				id: 'joyful',
				range: { min: 5 },
				effect: { incomeMultiplier: 1 },
				text: { summary: 'Joyful' },
				display: {
					summaryToken: 'happiness.tier.summary.joyful',
					title: 'Joyful',
				},
			},
		],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 2,
		basePopulationCap: 1,
		winConditions: [],
		corePhaseIds: { growth: phases[0].id, upkeep: phases[1].id },
	};
	const engineContext = createEngine({
		actions: registries.actions,
		buildings: registries.buildings,
		developments: registries.developments,
		populations: registries.populations,
		phases,
		start,
		rules,
	});
	const environment = createTranslationEnvironmentFromEngine(
		engineContext,
		registries,
	);
	engineContext.assets = environment.translationContext.assets;
	return {
		engineContext,
		happinessKey,
		translationContext: environment.translationContext,
	};
}

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('passive log labels', () => {
	it('uses tier summary tokens without exposing raw ids', () => {
		const { engineContext, happinessKey, translationContext } =
			createPassiveLogEnvironment();
		const activePlayerId = engineContext.activePlayer.id;
		const tierToken = 'happiness.tier.summary.joyful';

		const applyTierState = (value: number) => {
			engineContext.activePlayer.resources[happinessKey] = value;
			engineContext.services.handleTieredResourceChange(
				engineContext,
				engineContext.activePlayer,
				happinessKey,
			);
			if (!engineContext.passiveRecords) {
				engineContext.passiveRecords =
					{} as typeof engineContext.passiveRecords;
			}
			if (!engineContext.passiveRecords[activePlayerId]) {
				engineContext.passiveRecords[activePlayerId] = [];
			}
			if (value >= 5) {
				const passiveSummary = {
					id: 'tier:joyful',
					name: 'Joyful',
					icon: translationContext.assets.passive.icon,
					detail: tierToken,
					meta: { source: { labelToken: tierToken } },
				} as (typeof engineContext.activePlayer.passives)[number];
				engineContext.activePlayer.passives = [passiveSummary];
				engineContext.passiveRecords[activePlayerId] = [
					createPassiveRecord({
						id: 'tier:joyful',
						owner: activePlayerId,
						detail: tierToken,
						meta: { source: { labelToken: tierToken } },
					}),
				];
			} else {
				engineContext.activePlayer.passives = [];
				engineContext.passiveRecords[activePlayerId] = [];
			}
		};

		applyTierState(0);
		const beforeActivation = snapshotPlayer(
			engineContext.activePlayer,
			engineContext,
		);

		applyTierState(6);
		const afterActivation = snapshotPlayer(
			engineContext.activePlayer,
			engineContext,
		);

		const diffContext = createTranslationDiffContext(engineContext);
		const activationLines = diffStepSnapshots(
			beforeActivation,
			afterActivation,
			undefined,
			diffContext,
		);
		const activationLog = activationLines.find((line) =>
			line.includes('activated'),
		);
		expect(activationLog).toBeTruthy();
		expect(activationLog).not.toContain('happiness.tier.summary');
		const passiveIcon = engineContext.assets.passive.icon;
		if (passiveIcon) {
			expect(activationLog?.startsWith(`${passiveIcon} `)).toBe(true);
		}
		expect(activationLog).toContain('Joyful activated');

		const beforeExpiration = snapshotPlayer(
			engineContext.activePlayer,
			engineContext,
		);
		applyTierState(0);
		const afterExpiration = snapshotPlayer(
			engineContext.activePlayer,
			engineContext,
		);

		const expirationLines = diffStepSnapshots(
			beforeExpiration,
			afterExpiration,
			undefined,
			diffContext,
		);
		const expirationLog = expirationLines.find((line) =>
			line.includes('deactivated'),
		);
		expect(expirationLog).toBeTruthy();
		expect(expirationLog).not.toContain('happiness.tier.summary');
		if (passiveIcon) {
			expect(expirationLog?.startsWith(`${passiveIcon} `)).toBe(true);
		}
		expect(expirationLog).toContain('Joyful deactivated');
	});

	it('formats building passives and skips bonus activations', () => {
		const { engineContext } = createPassiveLogEnvironment();

		const before = snapshotPlayer(engineContext.activePlayer, engineContext);
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: 'castle_walls' },
				},
			],
			engineContext,
		);
		const after = snapshotPlayer(engineContext.activePlayer, engineContext);

		const diffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(before, after, undefined, diffContext);
		expect(lines.some((line) => line.includes('Castle Walls activated'))).toBe(
			false,
		);
		expect(lines.some((line) => line.includes('castle_walls_bonus'))).toBe(
			false,
		);
	});

	it('omits development passives and keeps stat changes grouped', () => {
		const { engineContext, translationContext } = createPassiveLogEnvironment();

		runEffects(
			[
				{
					type: 'land',
					method: 'add',
				},
			],
			engineContext,
		);

		const targetLand = engineContext.activePlayer.lands.at(-1);
		expect(targetLand).toBeTruthy();
		if (!targetLand) {
			return;
		}

		const before = snapshotPlayer(engineContext.activePlayer, engineContext);
		runEffects(
			[
				{
					type: 'development',
					method: 'add',
					params: {
						id: 'watchtower',
						landId: targetLand.id,
					},
				},
			],
			engineContext,
		);
		const after = snapshotPlayer(engineContext.activePlayer, engineContext);

		const diffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(before, after, undefined, diffContext);
		expect(lines.some((line) => line.includes('activated'))).toBe(false);

		const rawLabel = logContent(
			'development',
			'watchtower',
			translationContext,
		)[0];
		const label =
			rawLabel && typeof rawLabel === 'object'
				? rawLabel.text
				: (rawLabel ?? 'Watchtower');
		const expectedHeadline = `${LOG_KEYWORDS.developed} ${label}`;
		expect(lines).toContain(expectedHeadline);
		expect(
			lines.some(
				(line) =>
					line.includes('Fortification Strength') && line.includes('+2'),
			),
		).toBe(true);
		expect(
			lines.some(
				(line) => line.includes('Absorption') && line.includes('+50%'),
			),
		).toBe(true);
	});

	it('falls back when passive icon metadata is missing', () => {
		const { engineContext, translationContext, happinessKey } =
			createPassiveLogEnvironment();
		const activePlayerId = engineContext.activePlayer.id;
		const tierToken = 'happiness.tier.summary.joyful';
		engineContext.assets = {
			...translationContext.assets,
			passive: { label: translationContext.assets.passive.label },
		};

		const applyTierState = (value: number) => {
			engineContext.activePlayer.resources[happinessKey] = value;
			engineContext.services.handleTieredResourceChange(
				engineContext,
				engineContext.activePlayer,
				happinessKey,
			);
			if (!engineContext.passiveRecords) {
				engineContext.passiveRecords =
					{} as typeof engineContext.passiveRecords;
			}
			if (!engineContext.passiveRecords[activePlayerId]) {
				engineContext.passiveRecords[activePlayerId] = [];
			}
			if (value >= 5) {
				const passiveSummary = {
					id: 'tier:joyful',
					name: 'Joyful',
					icon: translationContext.assets.passive.icon,
					detail: tierToken,
					meta: { source: { labelToken: tierToken } },
				} as (typeof engineContext.activePlayer.passives)[number];
				engineContext.activePlayer.passives = [passiveSummary];
				engineContext.passiveRecords[activePlayerId] = [
					createPassiveRecord({
						id: 'tier:joyful',
						owner: activePlayerId,
						detail: tierToken,
						meta: { source: { labelToken: tierToken } },
					}),
				];
			} else {
				engineContext.activePlayer.passives = [];
				engineContext.passiveRecords[activePlayerId] = [];
			}
		};

		applyTierState(0);
		applyTierState(6);

		const before = snapshotPlayer(engineContext.activePlayer, engineContext);
		applyTierState(0);
		const after = snapshotPlayer(engineContext.activePlayer, engineContext);

		const diffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(before, after, undefined, diffContext);
		const activationLine = lines.find((line) => line.includes('deactivated'));
		expect(activationLine).toBeTruthy();
		expect(activationLine?.startsWith('undefined')).toBe(false);
	});
});
