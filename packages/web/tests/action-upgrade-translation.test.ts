import { describe, it, expect, beforeEach } from 'vitest';
import type {
	ActionConfig,
	ActionMetaCategoryConfig,
	EffectDef,
	SessionPlayerId,
} from '@kingdom-builder/protocol';
import {
	summarizeEffects,
	describeEffects,
	logEffects,
} from '../src/translation/effects';
import { summarizeContent, describeContent } from '../src/translation/content';
import { createTranslationContext } from '../src/translation/context';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

const TIER_ACTION_ID = 'test:tier_action';
const META_CATEGORY_ID = 'meta:test-research';
const BINDING_RESOURCE_ID = 'resource:core:happiness';

function buildTieredActionConfig(): ActionConfig {
	return {
		id: TIER_ACTION_ID,
		name: 'Tiered Action',
		icon: '🧪',
		category: 'basic',
		metaCategory: META_CATEGORY_ID,
		oneTime: true,
		tiers: {
			'1': {
				costs: { [BINDING_RESOURCE_ID]: 2 },
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: BINDING_RESOURCE_ID,
							change: { type: 'amount', amount: 1 },
						},
					} satisfies EffectDef,
				],
			},
			'2': {
				costs: { [BINDING_RESOURCE_ID]: 4 },
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: BINDING_RESOURCE_ID,
							change: { type: 'amount', amount: 5 },
						},
					} satisfies EffectDef,
				],
			},
			'3': {
				costs: { [BINDING_RESOURCE_ID]: 8 },
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							resourceId: BINDING_RESOURCE_ID,
							change: { type: 'amount', amount: 20 },
						},
					} satisfies EffectDef,
				],
			},
		},
	} as unknown as ActionConfig;
}

function buildMetaCategoryConfig(): ActionMetaCategoryConfig {
	return {
		id: META_CATEGORY_ID,
		label: 'Test Research',
		icon: '🧬',
		bindingResourceId: BINDING_RESOURCE_ID,
		costModel: 'per-item',
		visibilityTrigger: 'always',
		order: 99,
	};
}

function createHarness() {
	const scaffold = createTestSessionScaffold();
	const tieredAction = buildTieredActionConfig();
	scaffold.registries.actions.add(tieredAction.id, tieredAction);
	scaffold.registries.actionMetaCategories.add(
		META_CATEGORY_ID,
		buildMetaCategoryConfig(),
	);
	const activePlayer = createSnapshotPlayer({
		id: 'player:active' as SessionPlayerId,
	});
	const opponent = createSnapshotPlayer({
		id: 'player:opponent' as SessionPlayerId,
	});
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
	});
	const context = createTranslationContext(
		session,
		scaffold.registries,
		session.metadata,
		{
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		},
	);
	return { context };
}

describe('action:upgrade effect formatter', () => {
	let context: ReturnType<typeof createHarness>['context'];

	beforeEach(() => {
		context = createHarness().context;
	});

	it('summarizes targetAction upgrade with the action label', () => {
		const summary = summarizeEffects(
			[
				{
					type: 'action',
					method: 'upgrade',
					params: { targetAction: TIER_ACTION_ID },
				} as EffectDef,
			],
			context,
		);
		expect(summary).toEqual(['Upgrade 🧪 Tiered Action']);
	});

	it('describes targetAction upgrade with a sentence and nested card', () => {
		const described = describeEffects(
			[
				{
					type: 'action',
					method: 'upgrade',
					params: { targetAction: TIER_ACTION_ID },
				} as EffectDef,
			],
			context,
		);
		expect(described[0]).toBe('Upgrade 🧪 Tiered Action to the next tier');
		expect(described[1]).toMatchObject({
			title: '🧪 Tiered Action',
			_hoist: true,
			_desc: true,
		});
	});

	it('logs targetAction upgrade in past tense', () => {
		const logged = logEffects(
			[
				{
					type: 'action',
					method: 'upgrade',
					params: { targetAction: TIER_ACTION_ID },
				} as EffectDef,
			],
			context,
		);
		expect(logged).toEqual(['Upgraded 🧪 Tiered Action']);
	});

	it('summarizes randomInMetaCategory upgrade with the meta-category label', () => {
		const summary = summarizeEffects(
			[
				{
					type: 'action',
					method: 'upgrade',
					params: { randomInMetaCategory: META_CATEGORY_ID },
				} as EffectDef,
			],
			context,
		);
		expect(summary).toEqual(['Upgrade random 🧬 Test Research']);
	});

	it('describes randomInMetaCategory upgrade', () => {
		const described = describeEffects(
			[
				{
					type: 'action',
					method: 'upgrade',
					params: { randomInMetaCategory: META_CATEGORY_ID },
				} as EffectDef,
			],
			context,
		);
		expect(described).toEqual([
			'Upgrade a random 🧬 Test Research action to the next tier',
		]);
	});

	it('logs randomInMetaCategory upgrade in past tense', () => {
		const logged = logEffects(
			[
				{
					type: 'action',
					method: 'upgrade',
					params: { randomInMetaCategory: META_CATEGORY_ID },
				} as EffectDef,
			],
			context,
		);
		expect(logged).toEqual(['Upgraded a random 🧬 Test Research']);
	});

	it('returns nothing when no target is specified', () => {
		const summary = summarizeEffects(
			[{ type: 'action', method: 'upgrade', params: {} } as EffectDef],
			context,
		);
		expect(summary).toEqual([]);
	});
});

describe('ActionTranslator tier-aware rendering', () => {
	it('renders tier 1 effects by default', () => {
		const { context } = createHarness();
		const summary = summarizeContent('action', TIER_ACTION_ID, context);
		const serialized = JSON.stringify(summary);
		expect(serialized).toContain('+1');
	});

	it('renders the tier specified by options.currentTier', () => {
		const { context } = createHarness();
		const summary = summarizeContent('action', TIER_ACTION_ID, context, {
			currentTier: 2,
		});
		const serialized = JSON.stringify(summary);
		expect(serialized).toContain('+5');
		expect(serialized).not.toContain('+1');
	});

	it('renders tier 3 effects when currentTier is 3', () => {
		const { context } = createHarness();
		const describe = describeContent('action', TIER_ACTION_ID, context, {
			currentTier: 3,
		});
		const serialized = JSON.stringify(describe);
		expect(serialized).toContain('+20');
	});
});
