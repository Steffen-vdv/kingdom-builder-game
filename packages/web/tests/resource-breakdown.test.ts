import { describe, expect, it } from 'vitest';
import type { SessionResourceSourceLink as ResourceSourceLink } from '@kingdom-builder/protocol';
import { getResourceBreakdownSummary } from '../src/utils/resourceSources';
import { formatKindLabel } from '../src/utils/resourceSources/descriptorRegistry';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createTranslationContext } from '../src/translation/context/createTranslationContext';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';

type SummaryGroup = { title: string; items: unknown[] };

type BreakdownSetup = {
	translationContext: ReturnType<typeof createTranslationContext>;
	player: ReturnType<typeof createSnapshotPlayer>;
	primaryStatKey: string;
	secondaryStatKey: string;
	populationId: string;
	populationResourceId: string;
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

const BASE_RULES = {
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

const isSummaryObject = (entry: unknown): entry is SummaryGroup => {
	return (
		typeof entry === 'object' &&
		entry !== null &&
		'title' in entry &&
		'items' in entry &&
		Array.isArray((entry as { items?: unknown }).items)
	);
};

function createStatBreakdownSetup(): BreakdownSetup {
	const registries = createSessionRegistries();
	// Synthetic population ID for testing - under ResourceV2 populations
	// are resources
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
	// Resource ID for population
	const populationResourceId = populationId;
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
			fortificationStrength: {
				label: 'Citadel Guard',
				icon: '🛡️',
				description: 'Defines defensive resilience.',
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
		values: {
			[populationResourceId]: 2,
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
	const ruleSnapshot = { ...BASE_RULES, tieredResourceKey: resourceKey };
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

describe('resource breakdown summary', () => {
	it('includes ongoing and permanent army strength sources', () => {
		const setup = createStatBreakdownSetup();
		const {
			translationContext,
			player,
			primaryStatKey,
			populationResourceId,
			resourceKey,
			phaseId,
			phaseStepId,
			metadataSelectors,
		} = setup;
		const dependencies: ResourceSourceLink[] = [
			{ type: 'resource', id: populationResourceId },
			{ type: 'resource', id: resourceKey },
		];
		player.resourceSources[primaryStatKey] = {
			ongoing: {
				amount: 1,
				meta: {
					key: primaryStatKey,
					longevity: 'ongoing',
					kind: 'resource',
					id: populationResourceId,
					dependsOn: dependencies,
				},
			},
			permanent: {
				amount: 1,
				meta: {
					key: primaryStatKey,
					longevity: 'permanent',
					kind: 'phase',
					id: phaseId,
					detail: phaseStepId,
				},
			},
		};
		const summary = getResourceBreakdownSummary(
			primaryStatKey,
			player,
			translationContext,
		);
		expect(summary.length).toBeGreaterThanOrEqual(2);
		const groups = summary.filter(isSummaryObject);
		const ongoing = groups.find((entry) =>
			entry.items.some(
				(item) => typeof item === 'string' && item.includes('Ongoing'),
			),
		);
		expect(ongoing).toBeDefined();
		if (!ongoing) {
			return;
		}
		const populationLabel = formatKindLabel(
			translationContext,
			'resource',
			populationResourceId,
		);
		expect(ongoing.title).toContain(populationLabel);
		const ongoingTexts = ongoing.items.filter(
			(item): item is string => typeof item === 'string',
		);
		const condition = ongoingTexts.find((item) =>
			item.includes('Ongoing as long as'),
		);
		expect(condition).toBeDefined();
		if (condition) {
			const resourceLabel = formatKindLabel(
				translationContext,
				'resource',
				resourceKey,
			);
			expect(condition).toContain(resourceLabel);
		}
		const permanent = groups.find((entry) =>
			entry.title.toLowerCase().includes('phase'),
		);
		expect(permanent).toBeDefined();
		if (!permanent) {
			return;
		}
		const phaseMetadata = metadataSelectors.phaseMetadata.select(phaseId);
		expect(permanent.title).toContain(phaseMetadata.label);
		const permanentLines = permanent.items.filter(
			(item): item is string => typeof item === 'string',
		);
		const hasPermanent = permanentLines.some((line) =>
			line.includes('Permanent'),
		);
		expect(hasPermanent).toBe(true);
		const hasTrigger = permanentLines.some((line) =>
			line.startsWith('Triggered by'),
		);
		expect(hasTrigger).toBe(false);
	});

	it('omits removal suffix from build sources', () => {
		const setup = createStatBreakdownSetup();
		const { translationContext, player, primaryStatKey, actionId } = setup;
		player.resourceSources[primaryStatKey] = {
			build: {
				amount: 2,
				meta: {
					key: primaryStatKey,
					longevity: 'ongoing',
					kind: 'action',
					id: actionId,
				},
			},
		};
		const summary = getResourceBreakdownSummary(
			primaryStatKey,
			player,
			translationContext,
		);
		const groups = summary.filter(isSummaryObject);
		const buildEntry = groups.find((entry) =>
			entry.title.includes(
				formatKindLabel(translationContext, 'action', actionId),
			),
		);
		expect(buildEntry).toBeDefined();
		if (!buildEntry) {
			return;
		}
		expect(buildEntry.title).not.toContain('Removed');
	});

	it('falls back gracefully when stat metadata is missing', () => {
		const setup = createStatBreakdownSetup();
		const { translationContext, player, primaryStatKey } = setup;
		player.resourceSources[primaryStatKey] = {
			bonus: {
				amount: 2,
				meta: {
					key: primaryStatKey,
					longevity: 'ongoing',
					kind: 'building',
					id: setup.buildingId,
				},
			},
		};
		const mutatedContext = {
			...translationContext,
			assets: {
				...translationContext.assets,
				stats: {},
			},
		};
		const first = getResourceBreakdownSummary(
			primaryStatKey,
			player,
			mutatedContext,
		);
		const second = getResourceBreakdownSummary(
			primaryStatKey,
			player,
			mutatedContext,
		);
		expect(first.length).toBeGreaterThan(0);
		expect(second.length).toBeGreaterThan(0);
		const amountLine = first
			.flatMap((entry) => (typeof entry === 'string' ? [entry] : entry.items))
			.find((line) => typeof line === 'string' && line.includes('+2'));
		expect(amountLine).toBeDefined();
	});
});
