import type {
	SessionResourceValueMetadata,
	SessionResourceValueSnapshotMap,
} from '@kingdom-builder/protocol/session';
import { describe, expect, it } from 'vitest';

import { describeContent, logContent, summarizeContent } from '../../content';
import type { TranslationContext } from '../../context';
import type { ResourceValuesTranslationTarget } from '../types';

describe('ResourceValuesTranslator', () => {
	function createTarget(): ResourceValuesTranslationTarget {
		const metadata: SessionResourceValueMetadata = {
			descriptors: {
				alpha: {
					id: 'alpha',
					icon: '🅰️',
					label: 'Alpha',
					order: 1,
					groupId: 'group.parent',
				},
				beta: {
					id: 'beta',
					icon: '🅱️',
					label: 'Beta',
					order: 2,
					groupId: 'group.parent',
					displayAsPercent: true,
				},
				gamma: {
					id: 'gamma',
					icon: '🌀',
					label: 'Gamma',
					order: 3,
				},
			},
			groups: {
				'group.parent': {
					groupId: 'group.parent',
					parent: {
						id: 'parent',
						icon: '🏰',
						label: 'Parent',
						order: 1,
						limited: true,
					},
					children: ['alpha', 'beta'],
					order: 1,
				},
			},
			ordered: [
				{
					kind: 'group-parent',
					groupId: 'group.parent',
					parent: {
						id: 'parent',
						icon: '🏰',
						label: 'Parent',
						order: 1,
					},
				},
				{
					kind: 'value',
					descriptor: {
						id: 'alpha',
						icon: '🅰️',
						label: 'Alpha',
						order: 1,
					},
					groupId: 'group.parent',
				},
				{
					kind: 'value',
					descriptor: {
						id: 'beta',
						icon: '🅱️',
						label: 'Beta',
						order: 2,
					},
					groupId: 'group.parent',
				},
				{
					kind: 'value',
					descriptor: {
						id: 'gamma',
						icon: '🌀',
						label: 'Gamma',
						order: 3,
					},
				},
			],
			tiers: {
				alpha: {
					trackId: 'alpha-track',
					currentStepId: 'tier.step.1',
					nextStepId: 'tier.step.2',
					previousStepId: 'tier.step.0',
					progress: { current: 5, min: 0, max: 10 },
					steps: [
						{ id: 'tier.step.0', index: 0, min: 0, label: 'Dormant' },
						{ id: 'tier.step.1', index: 1, min: 5, label: 'Awakened' },
						{ id: 'tier.step.2', index: 2, min: 10, label: 'Ascendant' },
					],
				},
			},
			recent: [
				{ resourceId: 'alpha', amount: 4 },
				{ resourceId: 'gamma', amount: -2 },
			],
		} satisfies SessionResourceValueMetadata;
		const values: SessionResourceValueSnapshotMap = {
			parent: { value: 18 },
			alpha: { value: 12, lowerBound: 0, upperBound: 20 },
			beta: { value: 50, lowerBound: 0, upperBound: 100 },
			gamma: { value: 7, lowerBound: 0 },
		} satisfies SessionResourceValueSnapshotMap;
		return {
			metadata,
			values,
			globalActionCost: { resourceId: 'alpha', amount: 1 },
		} satisfies ResourceValuesTranslationTarget;
	}

	const EMPTY_CONTEXT = {} as TranslationContext;

	it('summarizes standalone and grouped resources with global costs', () => {
		const target = createTarget();
		const summary = summarizeContent('resource-values', target, EMPTY_CONTEXT);
		expect(summary[0]).toBe('All actions cost 🅰️ Alpha 1');
		const parentGroup = summary[1];
		if (typeof parentGroup === 'string') {
			throw new Error('Expected group summary for parent resource.');
		}
		expect(parentGroup.title).toBe('🏰 Parent 18');
		expect(parentGroup.items).toEqual([
			'🅰️ Alpha 12 (0→20)',
			'🅱️ Beta 50% (0→100)',
		]);
		const standalone = summary[2];
		if (typeof standalone !== 'string') {
			throw new Error('Expected standalone summary entry.');
		}
		expect(standalone).toBe('🌀 Gamma 7 (0→∞)');
	});

	it('describes tier transitions alongside resource entries', () => {
		const target = createTarget();
		const description = describeContent(
			'resource-values',
			target,
			EMPTY_CONTEXT,
		);
		const tierGroup = description.find(
			(entry) => typeof entry !== 'string' && entry.title.includes('Alpha'),
		);
		if (!tierGroup || typeof tierGroup === 'string') {
			throw new Error('Expected tier description group for alpha.');
		}
		expect(tierGroup.items).toEqual([
			'Current: Awakened (5/10)',
			'Next: Ascendant',
			'Previous: Dormant',
		]);
	});

	it('logs signed recent changes using canonical verbs', () => {
		const target = createTarget();
		const logEntries = logContent('resource-values', target, EMPTY_CONTEXT);
		expect(logEntries).toEqual(['Gain 🅰️ Alpha +4', 'Lose 🌀 Gamma -2']);
	});
});
