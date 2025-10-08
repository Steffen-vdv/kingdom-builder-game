import { describe, it, expect, vi } from 'vitest';
import {
	registerAttackOnDamageFormatter,
	buildOnDamageEntry,
} from '../src/translation/effects/formatters/attack';

vi.mock('../src/translation/effects/factory', () => ({
	registerEffectFormatter: vi.fn(),
	registerEvaluatorFormatter: vi.fn(),
	summarizeEffects: vi.fn(() => []),
	describeEffects: vi.fn(() => []),
	logEffects: vi.fn(() => []),
	formatEffectGroups: vi.fn(() => []),
}));
import type {
	AttackOnDamageLogEntry,
	EffectDef,
} from '@kingdom-builder/engine';
import { Resource, RESOURCES } from '@kingdom-builder/contents';
import type { TranslationContext } from '../src/translation/context';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';

function createTranslationCtx(): TranslationContext {
	const emptyModifiers = new Map<string, ReadonlyMap<string, unknown>>();
	return {
		actions: {
			get: vi.fn(),
			has: vi.fn(),
		},
		buildings: {
			get: vi.fn(),
			has: vi.fn(),
		},
		developments: {
			get: vi.fn(),
			has: vi.fn(),
		},
		passives: {
			list: vi.fn(() => []),
			get: vi.fn(() => undefined),
			getDefinition: vi.fn(() => undefined),
			definitions: vi.fn(() => []),
			get evaluationMods() {
				return emptyModifiers;
			},
		},
		phases: [],
		activePlayer: {
			id: 'A',
			name: 'Player',
			resources: {},
			stats: {},
			population: {},
		},
		opponent: {
			id: 'B',
			name: 'Opponent',
			resources: {},
			stats: {},
			population: {},
		},
		pullEffectLog: vi.fn(),
		actionCostResource: undefined,
		recentResourceGains: [],
		compensations: {
			A: {} as PlayerStartConfig,
			B: {} as PlayerStartConfig,
		},
		rules: { tieredResourceKey: 'happiness', tierDefinitions: [] },
	};
}

describe('attack on-damage formatter registry', () => {
	const attackEffect = {
		type: 'attack',
		method: 'perform',
		params: {},
	} as EffectDef<Record<string, unknown>>;
	const ctx = createTranslationCtx();

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

		const result = buildOnDamageEntry([logEntry], ctx, attackEffect);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler.mock.calls[0][0].entry).toBe(logEntry);
		expect(handler.mock.calls[0][0].ctx).toBe(ctx);
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
					key: Resource.gold,
					before: 5,
					after: 3,
				},
			],
			attacker: [
				{
					type: 'resource',
					key: Resource.gold,
					before: 1,
					after: 4,
				},
			],
		};

		const result = buildOnDamageEntry([logEntry], ctx, attackEffect);

		expect(result).not.toBeNull();
		const gold = RESOURCES[Resource.gold];
		const label = gold.icon ? `${gold.icon} ${gold.label}` : gold.label;
		expect(result?.items).toEqual([
			`Opponent: ${label} -2 (5→3)`,
			`${ctx.activePlayer.name}: ${label} +3 (1→4)`,
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
					key: Resource.gold,
					before: 10,
					after: 5,
				},
			],
			attacker: [
				{
					type: 'resource',
					key: Resource.gold,
					before: 2,
					after: 7,
				},
			],
		};

		const result = buildOnDamageEntry([logEntry], ctx, attackEffect);

		expect(result).not.toBeNull();
		const gold = RESOURCES[Resource.gold];
		const label = gold.icon ? `${gold.icon} ${gold.label}` : gold.label;
		expect(result?.items).toEqual([
			`Opponent: ${label} -0.5% (10→5) (-5)`,
			`${ctx.activePlayer.name}: ${label} +5 (2→7)`,
		]);
	});
});
