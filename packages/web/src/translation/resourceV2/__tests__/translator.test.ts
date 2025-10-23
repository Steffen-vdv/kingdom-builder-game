import { describe, expect, it } from 'vitest';
import type { SessionResourceValueMetadata } from '@kingdom-builder/protocol/session';
import { describeContent, logContent, summarizeContent } from '../../content';
import type { TranslationContext } from '../../context';
import type { ResourceV2TranslationSource } from '../types';

function createTranslationContextStub(
	overrides: Partial<TranslationContext> = {},
): TranslationContext {
	const base: TranslationContext = {
		actions: {
			get: () => {
				throw new Error('actions not implemented');
			},
			has: () => false,
		},
		actionCategories: {
			get: () => {
				throw new Error('action categories not implemented');
			},
			has: () => false,
			list: () => [],
		},
		buildings: {
			get: () => {
				throw new Error('buildings not implemented');
			},
			has: () => false,
		},
		developments: {
			get: () => {
				throw new Error('developments not implemented');
			},
			has: () => false,
		},
		populations: {
			get: () => {
				throw new Error('populations not implemented');
			},
			has: () => false,
		},
		passives: {
			list: () => [],
			get: () => undefined,
			getDefinition: () => undefined,
			definitions: () => Object.freeze([]),
			evaluationMods: new Map(),
		},
		phases: [],
		activePlayer: {
			id: 'A',
			name: 'Alpha',
			resources: {},
			stats: {},
			population: {},
		},
		opponent: {
			id: 'B',
			name: 'Beta',
			resources: {},
			stats: {},
			population: {},
		},
		rules: {
			tieredResourceKey: 'happiness',
			tierDefinitions: [],
			winConditions: [],
		},
		recentResourceGains: [],
		compensations: {},
		pullEffectLog: () => undefined,
		actionCostResource: undefined,
		assets: {
			resources: {},
			stats: {},
			populations: {},
			population: {},
			land: {},
			slot: {},
			passive: {},
			transfer: {},
			upkeep: {},
			modifiers: {},
			triggers: {},
			tierSummaries: {},
			formatPassiveRemoval: (description: string) => description,
		},
	};
	return Object.assign(base, overrides);
}

describe('ResourceV2Translator', () => {
	it('summarizes standalone resources', () => {
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				gold: {
					id: 'gold',
					label: 'Gold',
					icon: '🪙',
					order: 1,
				},
			},
			ordered: [
				{
					kind: 'value',
					descriptor: {
						id: 'gold',
						label: 'Gold',
						icon: '🪙',
						order: 1,
					},
				},
			],
		};
		const source: ResourceV2TranslationSource = {
			metadata,
			values: { gold: { value: 10 } },
		};
		const context = createTranslationContextStub();
		const summary = summarizeContent('resourceV2', source, context);
		expect(summary).toEqual(['🪙 Gold 10']);
	});

	it('groups child resources under the parent heading', () => {
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				gold: {
					id: 'gold',
					label: 'Gold',
					icon: '🪙',
					order: 1,
				},
				silver: {
					id: 'silver',
					label: 'Silver',
					icon: '🥈',
					order: 2,
				},
			},
			groups: {
				treasury: {
					groupId: 'treasury',
					parent: {
						id: 'treasury-parent',
						label: 'Treasury',
						icon: '🏛️',
						order: 0,
						limited: true,
					},
					order: 0,
					children: ['gold', 'silver'],
				},
			},
			ordered: [
				{
					kind: 'group-parent',
					groupId: 'treasury',
					parent: {
						id: 'treasury-parent',
						label: 'Treasury',
						icon: '🏛️',
						order: 0,
					},
				},
				{
					kind: 'value',
					descriptor: {
						id: 'gold',
						label: 'Gold',
						icon: '🪙',
						order: 1,
						groupId: 'treasury',
					},
					groupId: 'treasury',
				},
				{
					kind: 'value',
					descriptor: {
						id: 'silver',
						label: 'Silver',
						icon: '🥈',
						order: 2,
						groupId: 'treasury',
					},
					groupId: 'treasury',
				},
			],
		};
		const source: ResourceV2TranslationSource = {
			metadata,
			values: {
				gold: { value: 5 },
				silver: { value: 3 },
			},
		};
		const context = createTranslationContextStub();
		const summary = summarizeContent('resourceV2', source, context);
		expect(summary).toHaveLength(1);
		const group = summary[0];
		expect(group).toMatchObject({
			title: '🏛️ Treasury',
			items: ['🪙 Gold 5', '🥈 Silver 3'],
		});
	});

	it('describes tier progress and next milestone', () => {
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				gold: {
					id: 'gold',
					label: 'Gold',
					icon: '🪙',
					order: 1,
				},
			},
			tiers: {
				gold: {
					trackId: 'wealth',
					currentStepId: 'prosperous',
					nextStepId: 'wealthy',
					progress: { current: 3, min: 0, max: 5 },
					steps: [
						{
							id: 'prosperous',
							index: 0,
							min: 0,
							max: 5,
							label: 'Prosperous',
						},
						{
							id: 'wealthy',
							index: 1,
							min: 6,
							max: 10,
							label: 'Wealthy',
						},
					],
				},
			},
			ordered: [
				{
					kind: 'value',
					descriptor: {
						id: 'gold',
						label: 'Gold',
						icon: '🪙',
						order: 1,
					},
				},
			],
		};
		const source: ResourceV2TranslationSource = {
			metadata,
			values: { gold: { value: 10 } },
		};
		const context = createTranslationContextStub();
		const detail = describeContent('resourceV2', source, context);
		expect(detail).toEqual([
			'🪙 Gold 10 — Tier: Prosperous (3 / 5) → Next: Wealthy',
		]);
	});

	it('notes the global action cost resource when configured', () => {
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				gold: {
					id: 'gold',
					label: 'Gold',
					icon: '🪙',
					order: 1,
				},
			},
			ordered: [
				{
					kind: 'value',
					descriptor: {
						id: 'gold',
						label: 'Gold',
						icon: '🪙',
						order: 1,
					},
				},
			],
		};
		const source: ResourceV2TranslationSource = {
			metadata,
			values: { gold: { value: 6 } },
			globalActionCost: { resourceId: 'gold', amount: 3 },
		};
		const context = createTranslationContextStub({
			actionCostResource: 'gold',
		});
		const summary = summarizeContent('resourceV2', source, context);
		expect(summary[0]).toBe('Main action costs 3 🪙 Gold.');
	});

	it('logs recent gains and losses using standardized verbs', () => {
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				gold: {
					id: 'gold',
					label: 'Gold',
					icon: '🪙',
					order: 1,
				},
				silver: {
					id: 'silver',
					label: 'Silver',
					icon: '🥈',
					order: 2,
				},
			},
			ordered: [
				{
					kind: 'value',
					descriptor: {
						id: 'gold',
						label: 'Gold',
						icon: '🪙',
						order: 1,
					},
				},
			],
			recent: [
				{ resourceId: 'gold', amount: 2 },
				{ resourceId: 'silver', amount: -1 },
			],
		};
		const source: ResourceV2TranslationSource = {
			metadata,
			values: { gold: { value: 12 }, silver: { value: 4 } },
		};
		const context = createTranslationContextStub();
		const entries = logContent('resourceV2', source, context);
		expect(entries).toEqual(['Gain +2 🪙 Gold', 'Lose -1 🥈 Silver']);
	});
});
