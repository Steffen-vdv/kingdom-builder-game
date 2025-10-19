import { describe, it, expect, vi } from 'vitest';
import {
	registerAttackOnDamageFormatter,
	buildOnDamageEntry,
} from '../src/translation/effects/formatters/attack';
import type {
	AttackOnDamageLogEntry,
	EffectDef,
} from '@kingdom-builder/engine';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	createEmptySnapshotMetadata,
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createTranslationContext } from '../src/translation/context/createTranslationContext';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import { selectResourceDisplay } from '../src/translation/context/assetSelectors';
import { selectAttackResourceDescriptor } from '../src/translation/effects/formatters/attack/registrySelectors';
import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';
import { ownerLabel } from '../src/translation/effects/formatters/attackFormatterUtils';

vi.mock('../src/translation/effects/factory', () => ({
	registerEffectFormatter: vi.fn(),
	registerEvaluatorFormatter: vi.fn(),
	summarizeEffects: vi.fn(() => []),
	describeEffects: vi.fn(() => []),
	logEffects: vi.fn(() => []),
	formatEffectGroups: vi.fn(() => []),
}));

interface TestSetup {
	translationContext: ReturnType<typeof createTranslationContext>;
	resourceKey: string;
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
	customResourceLabel: string;
	diffResourceLabel: string;
}

const TEST_PHASES = [
	{
		id: 'phase:action',
		label: 'Action Phase',
		icon: '🎯',
		action: true,
		steps: [{ id: 'phase:action:resolve', label: 'Resolve' }],
	},
] as const;

const TEST_RULES = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'nearest',
	tieredResourceKey: 'resource:test',
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 1,
	winConditions: [],
} as const;

function createTestSetup(): TestSetup {
	const registries = createSessionRegistries();
	const [resourceKey] = Object.keys(registries.resources);
	if (!resourceKey) {
		throw new Error('Expected at least one resource definition.');
	}
	const ruleSnapshot = {
		...TEST_RULES,
		tieredResourceKey: resourceKey,
	};
	const attacker = createSnapshotPlayer({
		id: 'attacker',
		name: 'Attacker',
		resources: { [resourceKey]: 0 },
	});
	const defender = createSnapshotPlayer({
		id: 'defender',
		name: 'Defender',
		resources: { [resourceKey]: 0 },
	});
	const metadata: SessionSnapshotMetadata = createEmptySnapshotMetadata({
		resources: {
			[resourceKey]: {
				label: 'Auric Coin',
				icon: '🪙',
				description: 'Minted test currency.',
			},
		},
		assets: {
			land: { label: 'Territory', icon: '🗺️' },
			slot: { label: 'Development Slot', icon: '🧩' },
			passive: { label: 'Passive', icon: '♾️' },
		},
	});
	const sessionSnapshot = createSessionSnapshot({
		players: [attacker, defender],
		activePlayerId: attacker.id,
		opponentId: defender.id,
		phases: TEST_PHASES.map((phase) => ({
			...phase,
			steps: phase.steps.map((step) => ({ ...step, triggers: [] })),
		})),
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
	const resourceDisplay = selectResourceDisplay(
		translationContext.assets,
		resourceKey,
	);
	const resourceDescriptor =
		metadataSelectors.resourceMetadata.select(resourceKey);
	const labelSource = resourceDisplay.label ?? resourceDescriptor.label;
	const customResourceLabel = resourceDisplay.icon
		? `${resourceDisplay.icon} ${labelSource}`
		: labelSource;
	const diffDescriptor = selectAttackResourceDescriptor(
		translationContext,
		resourceKey,
	);
	const diffResourceLabel = diffDescriptor.icon
		? `${diffDescriptor.icon} ${diffDescriptor.label ?? resourceKey}`
		: (diffDescriptor.label ?? resourceKey);
	return {
		translationContext,
		resourceKey,
		metadataSelectors,
		customResourceLabel,
		diffResourceLabel,
	};
}

describe('attack on-damage formatter registry', () => {
	const attackEffect = {
		type: 'attack',
		method: 'perform',
		params: {},
	} as EffectDef<Record<string, unknown>>;
	const {
		translationContext,
		resourceKey,
		metadataSelectors,
		customResourceLabel,
		diffResourceLabel,
	} = createTestSetup();
	const defenderLabel = ownerLabel(translationContext, 'defender');
	const attackerLabel = ownerLabel(translationContext, 'attacker');

	it('delegates to registered handler for matching entries', () => {
		const logEntry: AttackOnDamageLogEntry = {
			owner: 'defender',
			effect: {
				type: '__test__',
				method: 'custom',
				params: {},
			} as EffectDef,
			attacker: [],
			defender: [],
		};
		const handlerResult = [{ title: 'Custom entry', items: [] }];
		const handler = vi.fn(() => handlerResult);
		registerAttackOnDamageFormatter('__test__', 'custom', handler);

		const result = buildOnDamageEntry(
			[logEntry],
			translationContext,
			attackEffect,
		);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].entry).toBe(logEntry);
		expect(handler.mock.calls[0][0].translationContext).toBe(
			translationContext,
		);
		expect(result).not.toBeNull();
		expect(result?.items).toEqual(handlerResult);
	});

	it('falls back to diff formatting when no handler is registered', () => {
		const logEntry: AttackOnDamageLogEntry = {
			owner: 'defender',
			effect: {
				type: 'resource',
				method: 'add',
				params: {},
			} as EffectDef,
			defender: [
				{
					type: 'resource',
					key: resourceKey,
					before: 5,
					after: 3,
				},
			],
			attacker: [
				{
					type: 'resource',
					key: resourceKey,
					before: 1,
					after: 4,
				},
			],
		};

		const result = buildOnDamageEntry(
			[logEntry],
			translationContext,
			attackEffect,
		);

		expect(result).not.toBeNull();
		expect(result?.items).toEqual([
			`${defenderLabel}: ${diffResourceLabel} -2 (5→3)`,
			`${attackerLabel}: ${diffResourceLabel} +3 (1→4)`,
		]);
	});

	it('formats resource transfer entries with percent modifiers', () => {
		const logEntry: AttackOnDamageLogEntry = {
			owner: 'defender',
			effect: {
				type: 'resource',
				method: 'transfer',
				params: { percent: 0.5 },
			} as EffectDef,
			defender: [
				{
					type: 'resource',
					key: resourceKey,
					before: 10,
					after: 5,
				},
			],
			attacker: [
				{
					type: 'resource',
					key: resourceKey,
					before: 2,
					after: 7,
				},
			],
		};

		const result = buildOnDamageEntry(
			[logEntry],
			translationContext,
			attackEffect,
		);

		expect(result).not.toBeNull();
		expect(result?.items).toEqual([
			`${defenderLabel}: ${diffResourceLabel} -0.5% (10→5) (-5)`,
			`${attackerLabel}: ${diffResourceLabel} +5 (2→7)`,
		]);
	});

	it('falls back to registry descriptors when resource metadata is missing', () => {
		const logEntry: AttackOnDamageLogEntry = {
			owner: 'defender',
			effect: {
				type: 'resource',
				method: 'add',
				params: {},
			} as EffectDef,
			defender: [
				{
					type: 'resource',
					key: resourceKey,
					before: 5,
					after: 3,
				},
			],
			attacker: [
				{
					type: 'resource',
					key: resourceKey,
					before: 1,
					after: 4,
				},
			],
		};

		const mutatedContext = {
			...translationContext,
			assets: {
				...translationContext.assets,
				resources: {},
			},
		} as typeof translationContext;
		const fallbackDescriptor = selectAttackResourceDescriptor(
			mutatedContext,
			resourceKey,
		);
		const fallbackResourceLabel = fallbackDescriptor.icon
			? `${fallbackDescriptor.icon} ${fallbackDescriptor.label ?? resourceKey}`
			: (fallbackDescriptor.label ?? resourceKey);

		const first = buildOnDamageEntry([logEntry], mutatedContext, attackEffect);
		const second = buildOnDamageEntry([logEntry], mutatedContext, attackEffect);

		expect(
			metadataSelectors.resourceMetadata.select(resourceKey).label,
		).toContain('Auric Coin');
		expect(customResourceLabel).toContain('Auric Coin');
		expect(diffResourceLabel).toContain('Auric Coin');
		expect(fallbackResourceLabel).not.toContain('Auric Coin');
		expect(first?.items).toEqual([
			`${ownerLabel(mutatedContext, 'defender')}: ${fallbackResourceLabel} -2 (5→3)`,
			`${ownerLabel(mutatedContext, 'attacker')}: ${fallbackResourceLabel} +3 (1→4)`,
		]);
		expect(second?.items).toEqual(first?.items);
	});
});
