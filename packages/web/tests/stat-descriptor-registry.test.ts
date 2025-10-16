import { describe, expect, it } from 'vitest';
import { getStatBreakdownSummary, formatStatValue } from '../src/utils/stats';
import { formatKindLabel } from '../src/utils/stats/descriptorRegistry';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createTranslationContext } from '../src/translation/context/createTranslationContext';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';

type SummaryGroup = { title?: unknown; items?: unknown[] };

type DescriptorSetup = {
	translationContext: ReturnType<typeof createTranslationContext>;
	player: ReturnType<typeof createSnapshotPlayer>;
	primaryStatKey: string;
	secondaryStatKey: string;
	populationId: string;
	buildingId: string;
	developmentId: string;
	actionId: string;
	resourceKey: string;
	phaseId: string;
	phaseStepId: string;
	triggerId: string;
	landId: string;
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
};

const DEFAULT_RULES = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'nearest',
	tieredResourceKey: 'resource:placeholder',
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 1,
	winConditions: [],
} as const;

const collectSummaryLines = (entry: unknown): string[] => {
	if (typeof entry === 'string') {
		return [entry];
	}
	if (!entry || typeof entry !== 'object') {
		return [];
	}
	const record = entry as SummaryGroup;
	const lines: string[] = [];
	if (typeof record.title === 'string' && record.title.trim()) {
		lines.push(record.title);
	}
	if (Array.isArray(record.items)) {
		record.items.forEach((item) => {
			collectSummaryLines(item).forEach((line) => lines.push(line));
		});
	}
	return lines;
};

function createDescriptorSetup(): DescriptorSetup {
	const registries = createSessionRegistries();
	const populationId = registries.populations.keys()[0];
	const buildingId = registries.buildings.keys()[0];
	const developmentId = registries.developments.keys()[0];
	const actionId = registries.actions.keys()[0];
	const resourceKey = Object.keys(registries.resources)[0];
	if (
		!populationId ||
		!buildingId ||
		!developmentId ||
		!actionId ||
		!resourceKey
	) {
		throw new Error('Expected registries to provide baseline entries.');
	}
	const phaseId = 'phase:test';
	const phaseStepId = 'phase:test:step';
	const triggerId = 'trigger:test';
	const landId = 'land:test';
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		populations: {
			[populationId]: { label: 'Legion Vanguard', icon: '🎖️' },
		},
		buildings: {
			[buildingId]: { label: 'Sky Bastion', icon: '🏯' },
		},
		developments: {
			[developmentId]: { label: 'Celestial Garden', icon: '🌿' },
		},
		resources: {
			[resourceKey]: {
				label: 'Starlight',
				icon: '✨',
				description: 'Brilliant astral currency.',
			},
		},
		stats: {
			armyStrength: {
				label: 'Steel Resolve',
				icon: '⚔️',
				description: 'Represents martial power.',
			},
			absorption: {
				label: 'Prismatic Barrier',
				icon: '🌈',
				description: 'Absorbs incoming damage.',
				displayAsPercent: true,
				format: { percent: true },
			},
		},
		triggers: {
			[triggerId]: {
				label: 'Starlight Surge',
				icon: '⚡',
				future: 'When the stars align',
				past: 'Starlight Surge',
			},
		},
		phases: {
			[phaseId]: {
				label: 'Ascension Phase',
				icon: '🛸',
				action: true,
				steps: [
					{
						id: phaseStepId,
						label: 'Empower',
						icon: '💫',
						triggers: [triggerId],
					},
				],
			},
		},
		assets: {
			land: { label: 'Territory', icon: '🗺️' },
			slot: { label: 'Development Slot', icon: '🧩' },
			passive: { label: 'Aura', icon: '♾️' },
		},
	};
	const activePlayer = createSnapshotPlayer({
		id: 'player:active',
		name: 'Active Player',
		resources: { [resourceKey]: 0 },
		population: { [populationId]: 2 },
		lands: [
			{
				id: landId,
				developments: [],
				slots: [],
			},
		],
	});
	const opponent = createSnapshotPlayer({
		id: 'player:opponent',
		name: 'Opponent',
	});
	const ruleSnapshot = { ...DEFAULT_RULES, tieredResourceKey: resourceKey };
	const sessionSnapshot = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: [
			{
				id: phaseId,
				label: 'Ascension Phase',
				icon: '🛸',
				action: true,
				steps: [
					{
						id: phaseStepId,
						label: 'Empower',
						icon: '💫',
						triggers: [triggerId],
					},
				],
			},
		],
		actionCostResource: resourceKey,
		ruleSnapshot,
		metadata,
	});
	const translationContext = createTranslationContext(
		sessionSnapshot,
		registries,
		metadata,
		{
			ruleSnapshot,
			passiveRecords: sessionSnapshot.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(registries, metadata);
	const active = sessionSnapshot.game.players.find(
		(player) => player.id === activePlayer.id,
	);
	if (!active) {
		throw new Error('Failed to locate active player snapshot.');
	}
	const statKeys = Object.keys(translationContext.assets.stats);
	const [primaryStatKey, secondaryStatKey = statKeys[0] ?? ''] = statKeys;
	if (!primaryStatKey) {
		throw new Error('Unable to resolve a stat key for testing.');
	}
	active.stats[primaryStatKey] = 0;
	if (secondaryStatKey) {
		active.stats[secondaryStatKey] = 3;
	}
	return {
		translationContext,
		player: active,
		primaryStatKey,
		secondaryStatKey: secondaryStatKey || primaryStatKey,
		populationId,
		buildingId,
		developmentId,
		actionId,
		resourceKey,
		phaseId,
		phaseStepId,
		triggerId,
		landId,
		metadataSelectors,
	};
}

describe('stat descriptor registry', () => {
	it('formats dependencies for each descriptor kind', () => {
		const setup = createDescriptorSetup();
		const {
			translationContext,
			player,
			primaryStatKey,
			secondaryStatKey,
			populationId,
			buildingId,
			developmentId,
			actionId,
			resourceKey,
			phaseId,
			phaseStepId,
			triggerId,
			landId,
			metadataSelectors,
		} = setup;
		const unknownId = 'mystery-source';
		const unknownDetail = 'mystery-detail';
		const resourceDetail = 'resource-detail';
		player.statSources[primaryStatKey] = {
			descriptor: {
				amount: 1,
				meta: {
					key: primaryStatKey,
					longevity: 'permanent',
					kind: 'action',
					id: actionId,
					dependsOn: [
						{ type: 'population', id: populationId },
						{ type: 'building', id: buildingId },
						{ type: 'development', id: developmentId },
						{ type: 'phase', id: phaseId, detail: phaseStepId },
						{ type: 'action', id: actionId },
						{ type: 'stat', id: secondaryStatKey },
						{ type: 'resource', id: resourceKey, detail: resourceDetail },
						{ type: 'trigger', id: triggerId },
						{ type: 'passive' },
						{ type: 'land', id: landId },
						{ type: 'start' },
						{ type: 'mystery', id: unknownId, detail: unknownDetail },
					],
				},
			},
		};
		const breakdown = getStatBreakdownSummary(
			primaryStatKey,
			player,
			translationContext,
		);
		const triggered = breakdown
			.flatMap((entry) => collectSummaryLines(entry))
			.filter((line) => line.startsWith('Triggered by'));
		expect(triggered).toHaveLength(12);
		const [
			populationLine,
			buildingLine,
			developmentLine,
			phaseLine,
			actionLine,
			statLine,
			resourceLine,
			triggerLine,
			passiveLine,
			landLine,
			startLine,
			unknownLine,
		] = triggered;
		const populationLabel = formatKindLabel(
			translationContext,
			'population',
			populationId,
		);
		expect(populationLine).toContain(populationLabel);
		expect(populationLine).toContain(`×${player.population[populationId]}`);
		const buildingLabel = formatKindLabel(
			translationContext,
			'building',
			buildingId,
		);
		expect(buildingLine).toContain(buildingLabel);
		const developmentLabel = formatKindLabel(
			translationContext,
			'development',
			developmentId,
		);
		expect(developmentLine).toContain(developmentLabel);
		const phaseMetadata = metadataSelectors.phaseMetadata.select(phaseId);
		if (phaseMetadata.icon) {
			expect(phaseLine.toLowerCase()).toContain(
				phaseMetadata.icon.toLowerCase(),
			);
		}
		if (phaseMetadata.label) {
			expect(phaseLine.toLowerCase()).toContain(
				phaseMetadata.label.toLowerCase(),
			);
		}
		const actionLabel = formatKindLabel(translationContext, 'action', actionId);
		expect(actionLine).toContain(actionLabel);
		const statLabel = formatKindLabel(
			translationContext,
			'stat',
			secondaryStatKey,
		);
		expect(statLine).toContain(statLabel);
		expect(statLine).toContain(
			formatStatValue(
				secondaryStatKey,
				player.stats[secondaryStatKey] ?? 0,
				translationContext.assets,
			),
		);
		const resourceLabel = formatKindLabel(
			translationContext,
			'resource',
			resourceKey,
		);
		expect(resourceLine).toContain(resourceLabel);
		expect(resourceLine).toContain('Resource Detail');
		const triggerLabel = formatKindLabel(
			translationContext,
			'trigger',
			triggerId,
		);
		expect(triggerLine).toContain(triggerLabel);
		const passiveLabel = formatKindLabel(translationContext, 'passive', '');
		expect(passiveLine).toContain(passiveLabel);
		const landLabel = formatKindLabel(translationContext, 'land', landId);
		expect(landLine).toContain(landLabel);
		expect(startLine).toContain('Initial Setup');
		expect(unknownLine).toContain(unknownId);
		expect(unknownLine).toContain('Mystery Detail');
	});

	it('falls back to ids and defaults when metadata is missing', () => {
		const setup = createDescriptorSetup();
		const { translationContext, primaryStatKey } = setup;
		const mutatedContext = {
			...translationContext,
			assets: {
				...translationContext.assets,
				populations: {},
				triggers: {},
			},
		};
		const populationFallback = formatKindLabel(
			mutatedContext,
			'population',
			'unknown-role',
		);
		expect(populationFallback).toContain('unknown-role');
		const triggerFallback = formatKindLabel(
			mutatedContext,
			'trigger',
			'mystery-trigger',
		);
		expect(triggerFallback).toBe('mystery-trigger');
		const phaseFallback = formatKindLabel(
			mutatedContext,
			'phase',
			'mystery-phase',
		);
		expect(phaseFallback).toBe('mystery-phase');
		const first = formatKindLabel(mutatedContext, 'phase', 'mystery-phase');
		const second = formatKindLabel(mutatedContext, 'phase', 'mystery-phase');
		expect(first).toBe(second);
		expect(primaryStatKey).toBeTruthy();
	});
});
