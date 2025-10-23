import { describe, expect, it } from 'vitest';
import type {
	SessionResourceOrderedValueEntry,
	SessionResourceTierStatus,
	SessionResourceValueDescriptor,
	SessionResourceValueMetadata,
	SessionResourceValueSnapshot,
} from '@kingdom-builder/protocol/session';
import { describeContent, logContent, summarizeContent } from '../../content';
import type { TranslationContext } from '../../context';
import type { ResourceValueTranslationTarget } from '../translator';

const EMPTY_CONTEXT = {} as unknown as TranslationContext;

function valueDescriptor(
	id: string,
	label: string,
	icon: string,
	order = 0,
): SessionResourceValueDescriptor {
	return {
		id,
		label,
		icon,
		order,
	};
}

function valueSnapshot(
	value: number,
	bounds?: { min?: number; max?: number },
): SessionResourceValueSnapshot {
	const snapshot: SessionResourceValueSnapshot = { value };
	if (typeof bounds?.min === 'number') {
		snapshot.lowerBound = bounds.min;
	}
	if (typeof bounds?.max === 'number') {
		snapshot.upperBound = bounds.max;
	}
	return snapshot;
}

describe('ResourceV2 translator', () => {
	it('formats standalone values for summaries', () => {
		const descriptor = valueDescriptor('absorption', 'Absorption', '🛡', 1);
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				absorption: descriptor,
			},
			ordered: [
				{
					kind: 'value',
					descriptor,
				} satisfies SessionResourceOrderedValueEntry,
			],
		};
		const target: ResourceValueTranslationTarget = {
			values: {
				absorption: valueSnapshot(12, { min: 0, max: 20 }),
			},
			metadata,
			globalActionCost: null,
		};

		const summary = summarizeContent(
			'resourceV2:values',
			target,
			EMPTY_CONTEXT,
		);

		expect(summary).toEqual(['🛡 Absorption 12 (min 0, max 20)']);
	});

	it('groups child resources under a parent heading', () => {
		const gold = valueDescriptor('gold', 'Gold', '🪙', 1);
		const food = valueDescriptor('food', 'Food', '🌾', 2);
		const parent = {
			groupId: 'treasury',
			parent: {
				id: 'treasury',
				label: 'Treasury',
				icon: '🏛️',
				limited: true,
			},
			children: ['gold', 'food'],
		};
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				gold,
				food,
			},
			groups: {
				treasury: parent,
			},
			ordered: [
				{
					kind: 'group-parent',
					groupId: 'treasury',
					parent: {
						...parent.parent,
						order: 0,
					},
				} satisfies SessionResourceOrderedValueEntry,
				{
					kind: 'value',
					descriptor: gold,
					groupId: 'treasury',
				} satisfies SessionResourceOrderedValueEntry,
				{
					kind: 'value',
					descriptor: food,
					groupId: 'treasury',
				} satisfies SessionResourceOrderedValueEntry,
			],
		};
		const target: ResourceValueTranslationTarget = {
			values: {
				gold: valueSnapshot(10),
				food: valueSnapshot(4),
			},
			metadata,
			globalActionCost: null,
		};

		const summary = summarizeContent(
			'resourceV2:values',
			target,
			EMPTY_CONTEXT,
		);

		expect(summary).toEqual([
			{
				title: '🏛️ Treasury (limited)',
				items: ['🪙 Gold 10', '🌾 Food 4'],
			},
		]);
	});

	it('logs recent gains with tier transitions', () => {
		const prestige = valueDescriptor('prestige', 'Prestige', '🏆', 1);
		const steps: TierStepSnapshot[] = [
			{ id: 'novice', index: 0, min: 0, max: 4, label: 'Novice' },
			{ id: 'champion', index: 1, min: 5, max: 9, label: 'Champion' },
		];
		const tierStatus: SessionResourceTierStatus = {
			trackId: 'prestige-track',
			previousStepId: 'novice',
			currentStepId: 'champion',
			progress: { current: 6, min: 5, max: 9 },
			steps,
		};
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				prestige,
			},
			tiers: {
				prestige: tierStatus,
			},
			ordered: [
				{
					kind: 'value',
					descriptor: prestige,
				} satisfies SessionResourceOrderedValueEntry,
			],
			recent: [
				{
					resourceId: 'prestige',
					amount: 5,
				},
			],
		};
		const target: ResourceValueTranslationTarget = {
			values: {
				prestige: valueSnapshot(6),
			},
			metadata,
			globalActionCost: null,
		};

		const log = logContent('resourceV2:values', target, EMPTY_CONTEXT);

		expect(log).toEqual([
			'Gain 🏆 Prestige +5',
			'Prestige tier advanced from Novice to Champion',
		]);
	});

	it('appends the global action cost to descriptions', () => {
		const actionPoints = valueDescriptor('ap', 'Action Points', '⚙️', 0);
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				ap: actionPoints,
			},
			ordered: [
				{
					kind: 'value',
					descriptor: actionPoints,
				} satisfies SessionResourceOrderedValueEntry,
			],
		};
		const target: ResourceValueTranslationTarget = {
			values: {
				ap: valueSnapshot(3),
			},
			metadata,
			globalActionCost: {
				resourceId: 'ap',
				amount: 1,
				description: 'Primary action cost',
			},
		};

		const detail = describeContent('resourceV2:values', target, EMPTY_CONTEXT);

		expect(detail).toEqual([
			'⚙️ Action Points 3',
			'Global action cost: ⚙️ Action Points',
		]);
	});
});
type TierStepSnapshot = NonNullable<SessionResourceTierStatus['steps']>[number];
