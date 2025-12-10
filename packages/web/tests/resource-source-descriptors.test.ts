import { describe, expect, it } from 'vitest';
import { getResourceBreakdownSummary } from '../src/utils/resourceSources';
import { formatTriggerLabel } from '../src/utils/resourceSources/descriptors';
import { formatKindLabel } from '../src/utils/resourceSources/descriptorRegistry';
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
	populationResourceId: string;
	statResourceId: string;
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
	// Synthetic population ID - under ResourceV2 populations are resources
	const populationId = 'resource:population:role:legion';
	const buildingId = registries.buildings.keys()[0];
	const developmentId = registries.developments.keys()[0];
	const actionId = registries.actions.keys()[0];
	const resourceKey = Object.keys(registries.resources)[0];
	if (!buildingId || !developmentId || !actionId || !resourceKey) {
		throw new Error('Expected registries to provide baseline entries.');
	}
	const phaseId = 'phase:test';
	const phaseStepId = 'phase:test:step';
	const triggerId = 'trigger:test';
	const landId = 'land:test';
	// Resource IDs for population and stat
	const populationResourceId = populationId;
	const statResourceId = 'resource:stat:army-strength';
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
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
				text: 'When the stars align',
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
		values: {
			[populationResourceId]: 2,
			[statResourceId]: 3,
		},
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
		resourceMetadata: {
			[populationResourceId]: {
				icon: '🎖️',
				label: 'Legion Vanguard',
			},
			[statResourceId]: {
				icon: '⚔️',
				label: 'Steel Resolve',
			},
		},
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
	const resourceKeys = Object.keys(translationContext.assets.resources);
	const [primaryResourceKey, secondaryResourceKey = resourceKeys[0] ?? ''] =
		resourceKeys;
	if (!primaryResourceKey) {
		throw new Error('Unable to resolve a resource key for testing.');
	}
	active.values[primaryResourceKey] = 0;
	if (secondaryResourceKey) {
		active.values[secondaryResourceKey] = 3;
	}
	return {
		translationContext,
		player: active,
		primaryStatKey: primaryResourceKey,
		secondaryStatKey: secondaryResourceKey || primaryResourceKey,
		populationId,
		populationResourceId,
		statResourceId,
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

describe('resource source descriptors', () => {
	it('formats dependencies for each descriptor kind', () => {
		const setup = createDescriptorSetup();
		const {
			translationContext,
			player,
			primaryStatKey,
			populationResourceId,
			statResourceId,
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
		player.resourceSources[primaryStatKey] = {
			descriptor: {
				amount: 1,
				meta: {
					key: primaryStatKey,
					longevity: 'permanent',
					kind: 'action',
					id: actionId,
					dependsOn: [
						{ type: 'resource', id: populationResourceId },
						{ type: 'building', id: buildingId },
						{ type: 'development', id: developmentId },
						{ type: 'phase', id: phaseId, detail: phaseStepId },
						{ type: 'action', id: actionId },
						{ type: 'resource', id: statResourceId },
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
		const breakdown = getResourceBreakdownSummary(
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
			'resource',
			populationResourceId,
		);
		expect(populationLine).toContain(populationLabel);
		// Resource values are shown directly from values
		const popValue = String(player.values[populationResourceId]);
		expect(populationLine).toContain(popValue);
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
			'resource',
			statResourceId,
		);
		expect(statLine).toContain(statLabel);
		// Stat values from values are displayed directly (not percent)
		const statValue = String(player.values[statResourceId]);
		expect(statLine).toContain(statValue);
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
		// Trigger descriptors use text field for display, falling back to label
		expect(triggerLabel).toContain('When the stars align');
		expect(triggerLine).toContain(triggerLabel);
		const passiveLabel = formatKindLabel(translationContext, 'passive', '');
		expect(passiveLine).toContain(passiveLabel);
		const landLabel = formatKindLabel(translationContext, 'land', landId);
		expect(landLine).toContain(landLabel);
		expect(startLine).toContain('[MISSING:start]');
		expect(unknownLine).toContain(unknownId);
		expect(unknownLine).toContain('Mystery Detail');
	});

	it('falls back to ids and defaults when metadata is missing', () => {
		const setup = createDescriptorSetup();
		const { translationContext, primaryStatKey, triggerId } = setup;
		const mutatedContext = {
			...translationContext,
			assets: {
				...translationContext.assets,
				populations: {},
				triggers: {},
			},
		};
		const resourceFallback = formatKindLabel(
			mutatedContext,
			'resource',
			'unknown-resource',
		);
		expect(resourceFallback).toContain('unknown-resource');
		// Trigger lookups now throw for missing metadata (strictness principle)
		expect(() =>
			formatKindLabel(mutatedContext, 'trigger', 'mystery-trigger'),
		).toThrow('Trigger "mystery-trigger" not found in assets');
		// formatTriggerLabel uses text field for display, falling back to label
		const formattedTrigger = formatTriggerLabel(
			translationContext.assets,
			triggerId,
		);
		expect(formattedTrigger).toBe('⚡ When the stars align');
		// Missing triggers throw errors
		expect(() =>
			formatTriggerLabel(mutatedContext.assets, 'unknown-trigger'),
		).toThrow('Trigger "unknown-trigger" not found in assets');
		const phaseFallback = formatKindLabel(
			mutatedContext,
			'phase',
			'mystery-phase',
		);
		expect(phaseFallback).toBe('⚠️ [MISSING:phase:mystery-phase]');
		const first = formatKindLabel(mutatedContext, 'phase', 'mystery-phase');
		const second = formatKindLabel(mutatedContext, 'phase', 'mystery-phase');
		expect(first).toBe(second);
		expect(primaryStatKey).toBeTruthy();
	});
});
