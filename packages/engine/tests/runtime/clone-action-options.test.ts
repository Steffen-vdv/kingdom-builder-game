import { describe, expect, it } from 'vitest';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import { cloneActionOptions } from '../../src/runtime/action_options';

describe('cloneActionOptions', () => {
	it('deep clones nested option fields without sharing references', () => {
		const nestedParams = { nested: { value: 'initial' } };
		const nestedSummary = { segments: ['initial'] };
		const nestedDescription = { sentences: ['initial'] };
		const nestedIcon = { emoji: '🏰' };

		const rawGroups = [
			{
				id: 'group',
				title: 'Group',
				options: [
					{
						id: 'option',
						actionId: 'action',
						params: nestedParams,
						summary: nestedSummary,
						description: nestedDescription,
						icon: nestedIcon,
					} as unknown as ActionEffectGroup['options'][number],
				],
			},
		];

		const groups = rawGroups as unknown as ActionEffectGroup[];
		const clonedGroups = cloneActionOptions(groups);

		type OriginalOption = {
			params: typeof nestedParams;
			summary: typeof nestedSummary;
			description: typeof nestedDescription;
			icon: typeof nestedIcon;
		};
		const originalOption = rawGroups[0].options[0] as OriginalOption;
		const clonedOption = clonedGroups[0].options[0];
		const clonedParams = clonedOption.params as typeof nestedParams;
		const clonedSummary =
			clonedOption.summary as unknown as typeof nestedSummary;
		const clonedDescription =
			clonedOption.description as unknown as typeof nestedDescription;
		const clonedIcon = clonedOption.icon as unknown as typeof nestedIcon;

		expect(clonedGroups).not.toBe(groups);
		expect(clonedOption).not.toBe(originalOption);
		expect(clonedParams).not.toBe(nestedParams);
		expect(clonedSummary).not.toBe(nestedSummary);
		expect(clonedDescription).not.toBe(nestedDescription);
		expect(clonedIcon).not.toBe(nestedIcon);
		expect(clonedParams).toEqual(nestedParams);
		expect(clonedSummary).toEqual(nestedSummary);
		expect(clonedDescription).toEqual(nestedDescription);
		expect(clonedIcon).toEqual(nestedIcon);

		(originalOption.params as typeof nestedParams).nested.value =
			'original-mutation';
		(originalOption.summary as typeof nestedSummary).segments.push(
			'original-mutation',
		);
		(originalOption.description as typeof nestedDescription).sentences.push(
			'original-mutation',
		);
		(originalOption.icon as typeof nestedIcon).emoji = '🔥';

		expect(clonedParams.nested.value).toBe('initial');
		expect(clonedSummary.segments).toEqual(['initial']);
		expect(clonedDescription.sentences).toEqual(['initial']);
		expect(clonedIcon.emoji).toBe('🏰');

		clonedParams.nested.value = 'clone-mutation';
		clonedSummary.segments.push('clone-mutation');
		clonedDescription.sentences.push('clone-mutation');
		clonedIcon.emoji = '⚔️';

		expect((originalOption.params as typeof nestedParams).nested.value).toBe(
			'original-mutation',
		);
		expect((originalOption.summary as typeof nestedSummary).segments).toEqual([
			'initial',
			'original-mutation',
		]);
		expect(
			(originalOption.description as typeof nestedDescription).sentences,
		).toEqual(['initial', 'original-mutation']);
		expect((originalOption.icon as typeof nestedIcon).emoji).toBe('🔥');
	});

	it('preserves primitive-only option fields', () => {
		const groups: ActionEffectGroup[] = [
			{
				id: 'group',
				title: 'Group',
				summary: 'group summary',
				description: 'group description',
				icon: 'group-icon',
				options: [
					{
						id: 'option',
						actionId: 'action',
						label: 'Option label',
						summary: 'option summary',
						description: 'option description',
						icon: 'option-icon',
					},
				],
			},
		];

		const clonedGroups = cloneActionOptions(groups);

		expect(clonedGroups).not.toBe(groups);
		expect(clonedGroups[0].options[0]).not.toBe(groups[0].options[0]);
		expect(clonedGroups[0].summary).toBe('group summary');
		expect(clonedGroups[0].description).toBe('group description');
		expect(clonedGroups[0].icon).toBe('group-icon');
		expect(clonedGroups[0].options[0].summary).toBe('option summary');
		expect(clonedGroups[0].options[0].description).toBe('option description');
		expect(clonedGroups[0].options[0].icon).toBe('option-icon');
	});
});
