import { describe, expect, it } from 'vitest';
import type { ResourceV2TierTrackDefinition } from '@kingdom-builder/protocol';
import { createTranslationAssets } from '../../src/translation/context/assets';
import { createResourceV2Selectors } from '../../src/translation/resourceV2/selectors';
import { createTestSessionScaffold } from '../helpers/testSessionScaffold';

const createTierTrack = (id: string): ResourceV2TierTrackDefinition => ({
	id,
	tiers: [
		{
			id: `${id}.tier1`,
			range: { min: 0, max: 5 },
		},
		{
			id: `${id}.tier2`,
			range: { min: 5 },
		},
	],
});

describe('ResourceV2 translation selectors', () => {
	const definitionAlpha = Object.freeze({
		id: 'resource.alpha',
		display: {
			name: 'Alpha',
			icon: '🅰️',
			description: 'Primary alpha resource.',
			order: 1,
			displayAsPercent: false,
		},
		bounds: { lowerBound: 0, upperBound: 10 },
		tierTrack: createTierTrack('alpha'),
		globalActionCost: { amount: 3 },
	});

	const definitionBeta = Object.freeze({
		id: 'resource.beta',
		display: {
			name: 'Beta',
			order: 2,
		},
		group: { groupId: 'group.parent', order: 1 },
	});

	const parentGroup = Object.freeze({
		id: 'group.parent',
		order: 1,
		parent: {
			id: 'resource.parent',
			display: {
				name: 'Parent',
				icon: '🅿️',
				description: 'Parent aggregate resource.',
				order: 0,
				displayAsPercent: true,
			},
			bounds: { lowerBound: 0, upperBound: 100 },
			tierTrack: createTierTrack('parent'),
			relation: 'sumOfAll' as const,
		},
		children: ['resource.beta'],
	});

	it('selects ResourceV2 display details with parent fallbacks', () => {
		const selectors = createResourceV2Selectors(
			[definitionAlpha, definitionBeta],
			[parentGroup],
		);
		expect(selectors.has('resource.alpha')).toBe(true);
		expect(selectors.has('resource.beta')).toBe(true);
		expect(selectors.has('resource.parent')).toBe(true);

		const alphaDisplay = selectors.selectDisplay('resource.alpha');
		expect(alphaDisplay).toEqual(
			expect.objectContaining({
				label: 'Alpha',
				icon: '🅰️',
				description: 'Primary alpha resource.',
			}),
		);
		expect(selectors.selectPercentFormat('resource.alpha')).toBe(false);
		expect(selectors.selectBounds('resource.alpha')).toEqual(
			expect.objectContaining({
				lowerBound: 0,
				upperBound: 10,
			}),
		);
		expect(selectors.selectTierTrack('resource.alpha')).toEqual(
			expect.objectContaining({ id: 'alpha' }),
		);
		expect(selectors.selectGlobalCostInfo('resource.alpha')).toEqual({
			amount: 3,
			label: 'Alpha',
			icon: '🅰️',
		});

		const betaDisplay = selectors.selectDisplay('resource.beta');
		expect(betaDisplay).toEqual(
			expect.objectContaining({
				label: 'Beta',
				icon: '🅿️',
			}),
		);
		expect(selectors.selectPercentFormat('resource.beta')).toBe(true);
		expect(selectors.selectBounds('resource.beta')).toEqual(
			expect.objectContaining({
				lowerBound: 0,
				upperBound: 100,
			}),
		);
		expect(selectors.selectTierTrack('resource.beta')).toEqual(
			expect.objectContaining({ id: 'parent' }),
		);
		expect(selectors.selectGlobalCostInfo('resource.beta')).toBeUndefined();

		const parentDisplay = selectors.selectDisplay('resource.parent');
		expect(parentDisplay).toEqual(
			expect.objectContaining({
				label: 'Parent',
				icon: '🅿️',
				displayAsPercent: true,
			}),
		);
	});

	it('uses ResourceV2 metadata when legacy maps are empty', () => {
		const { registries, metadata, ruleSnapshot } = createTestSessionScaffold();
		const assets = createTranslationAssets(
			{
				populations: registries.populations,
				resources: {},
				resourceDefinitions: Object.freeze([definitionAlpha, definitionBeta]),
				resourceGroups: Object.freeze([parentGroup]),
			},
			{
				...metadata,
				resources: {},
			},
			{ rules: ruleSnapshot },
		);

		expect(assets.resources['resource.alpha']).toEqual(
			expect.objectContaining({
				label: 'Alpha',
				icon: '🅰️',
				description: 'Primary alpha resource.',
			}),
		);
		expect(assets.resources['resource.beta']).toEqual(
			expect.objectContaining({
				label: 'Beta',
				icon: '🅿️',
				displayAsPercent: true,
			}),
		);
		expect(assets.resourceV2.selectBounds('resource.beta')).toEqual(
			expect.objectContaining({ upperBound: 100 }),
		);
	});
});
