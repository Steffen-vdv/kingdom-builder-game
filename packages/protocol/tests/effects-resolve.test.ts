import { describe, expect, it } from 'vitest';

import { createContentFactory } from '@kingdom-builder/testing';

import {
	applyParamsToEffects,
	coerceActionEffectGroupChoices,
	resolveActionEffects,
} from '../src/effects/resolve';
import { Registry } from '../src/registry';
import type { ActionEffectGroup, ActionEffectGroupOption } from '../src';
import type { EffectDef } from '../src/effects';

function createActionFixtures() {
	const content = createContentFactory();
	const performDevelopment = content.action({
		id: 'perform-development',
		name: 'Perform Development',
		effects: [],
	});
	const rallyTroops = content.action({
		id: 'rally-troops',
		name: 'Rally Troops',
		effects: [],
	});

	const installOption: ActionEffectGroupOption = {
		id: 'install-development-option',
		actionId: performDevelopment.id,
		label: 'Install Development',
		summary: 'Install a prepared development.',
		params: {
			developmentId: '$developmentId',
			slot: 'primary-slot',
		},
	};
	const rallyOption: ActionEffectGroupOption = {
		id: 'rally-troops-option',
		actionId: rallyTroops.id,
		label: 'Rally Troops',
		summary: 'Call in additional support.',
		params: {
			roleId: '$roleId',
		},
	};

	const group: ActionEffectGroup = {
		id: 'follow-up-action',
		title: 'Select a follow-up action',
		options: [installOption, rallyOption],
	};

	const action = content.action({
		id: 'resolve-effects-action',
		name: 'Resolve Effects',
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: {
					amount: '$amount',
					resourceId: '$resourceId',
					note: 'base-effect',
				},
				meta: {
					tokens: ['$logToken', { label: '$logLabel' }],
				},
			},
			group,
		],
	});

	return { action, group, installOption, rallyOption };
}

describe('applyParamsToEffects', () => {
	it('replaces placeholders across params, evaluator data, and metadata', () => {
		const baseEffect: EffectDef = {
			type: 'resource',
			method: 'add',
			params: {
				amount: '$amount',
				resourceId: '$resourceId',
				note: 'stable',
			},
			evaluator: {
				type: 'times',
				params: {
					count: '$count',
				},
			},
			effects: [
				{
					type: 'log',
					method: 'push',
					params: {
						message: '$message',
					},
				},
			],
			meta: {
				labels: ['$primaryLabel', { nested: '$secondaryLabel' }],
				note: '$metaNote',
			},
		};

		const substituted = applyParamsToEffects(baseEffect.effects ?? [], {
			amount: 12,
			resourceId: 'resource.gold',
			count: 3,
			message: 'Harvest complete',
			primaryLabel: 'economy',
			secondaryLabel: 'growth',
			metaNote: 'Applied via automation',
		});

		expect(substituted).toEqual([
			{
				type: 'log',
				method: 'push',
				params: {
					message: 'Harvest complete',
				},
			},
		]);

		const [effect] = applyParamsToEffects([baseEffect], {
			amount: 12,
			resourceId: 'resource.gold',
			count: 3,
			message: 'Harvest complete',
			primaryLabel: 'economy',
			secondaryLabel: 'growth',
			metaNote: 'Applied via automation',
		});

		expect(effect).toEqual({
			type: 'resource',
			method: 'add',
			params: {
				amount: 12,
				resourceId: 'resource.gold',
				note: 'stable',
			},
			evaluator: {
				type: 'times',
				params: {
					count: 3,
				},
			},
			effects: [
				{
					type: 'log',
					method: 'push',
					params: {
						message: 'Harvest complete',
					},
				},
			],
			meta: {
				labels: ['economy', { nested: 'growth' }],
				note: 'Applied via automation',
			},
		});
	});
});

describe('coerceActionEffectGroupChoices', () => {
	it('normalizes arbitrary payloads into group choice maps', () => {
		const raw = {
			valid: {
				optionId: 'install-development-option',
				params: {
					developmentId: 'development.alpha',
				},
			},
			missingOption: {
				params: {
					developmentId: 'development.beta',
				},
			},
			wrongShape: 'install-development-option',
			invalidParams: {
				optionId: 'install-development-option',
				params: 'not-an-object',
			},
		};

		expect(coerceActionEffectGroupChoices(raw)).toEqual({
			valid: {
				optionId: 'install-development-option',
				params: {
					developmentId: 'development.alpha',
				},
			},
			invalidParams: { optionId: 'install-development-option' },
		});
	});
});

describe('resolveActionEffects', () => {
	it('records missing selections when no option is chosen', () => {
		const { action, group } = createActionFixtures();
		const registry = new Registry<typeof action>();
		registry.add(action.id, action);

		const resolved = resolveActionEffects(registry.get(action.id), {
			amount: 4,
			resourceId: 'resource.stone',
			logToken: 'log:stone-gain',
			logLabel: 'Stone Gain',
		});

		expect(resolved.missingSelections).toEqual([group.id]);
		expect(resolved.groups).toEqual([
			{
				group,
			},
		]);
		expect(resolved.effects).toEqual([
			{
				type: 'resource',
				method: 'add',
				params: {
					amount: 4,
					resourceId: 'resource.stone',
					note: 'base-effect',
				},
				meta: {
					tokens: ['log:stone-gain', { label: 'Stone Gain' }],
				},
			},
		]);
		expect(resolved.steps).toEqual([
			{
				type: 'effects',
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							amount: 4,
							resourceId: 'resource.stone',
							note: 'base-effect',
						},
						meta: {
							tokens: ['log:stone-gain', { label: 'Stone Gain' }],
						},
					},
				],
			},
			{
				type: 'group',
				group,
				params: {
					amount: 4,
					resourceId: 'resource.stone',
					logToken: 'log:stone-gain',
					logLabel: 'Stone Gain',
				},
			},
		]);
	});

	it('applies selection parameters and option effects when a choice exists', () => {
		const { action, group, installOption } = createActionFixtures();
		const registry = new Registry<typeof action>();
		registry.add(action.id, action);

		const resolved = resolveActionEffects(registry.get(action.id), {
			amount: 6,
			resourceId: 'resource.gold',
			developmentId: 'development.gamma',
			logToken: 'log:install',
			logLabel: 'Install Development',
			choices: {
				[group.id]: {
					optionId: installOption.id,
					params: {
						source: 'actions-panel',
					},
				},
			},
		});

		expect(resolved.missingSelections).toEqual([]);
		expect(resolved.groups).toEqual([
			{
				group,
				selection: {
					option: installOption,
					effects: [
						{
							type: 'action',
							method: 'perform',
							params: {
								amount: 6,
								resourceId: 'resource.gold',
								developmentId: 'development.gamma',
								logToken: 'log:install',
								logLabel: 'Install Development',
								source: 'actions-panel',
								slot: 'primary-slot',
								id: 'development.gamma',
								actionId: installOption.actionId,
								__actionId: installOption.actionId,
							},
						},
					],
					params: {
						amount: 6,
						resourceId: 'resource.gold',
						developmentId: 'development.gamma',
						logToken: 'log:install',
						logLabel: 'Install Development',
						source: 'actions-panel',
						slot: 'primary-slot',
						id: 'development.gamma',
					},
				},
			},
		]);
		expect(resolved.effects).toEqual([
			{
				type: 'resource',
				method: 'add',
				params: {
					amount: 6,
					resourceId: 'resource.gold',
					note: 'base-effect',
				},
				meta: {
					tokens: ['log:install', { label: 'Install Development' }],
				},
			},
			{
				type: 'action',
				method: 'perform',
				params: {
					amount: 6,
					resourceId: 'resource.gold',
					developmentId: 'development.gamma',
					logToken: 'log:install',
					logLabel: 'Install Development',
					source: 'actions-panel',
					slot: 'primary-slot',
					id: 'development.gamma',
					actionId: installOption.actionId,
					__actionId: installOption.actionId,
				},
			},
		]);
		expect(resolved.steps).toEqual([
			{
				type: 'effects',
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: {
							amount: 6,
							resourceId: 'resource.gold',
							note: 'base-effect',
						},
						meta: {
							tokens: ['log:install', { label: 'Install Development' }],
						},
					},
				],
			},
			{
				type: 'group',
				group,
				selection: {
					option: installOption,
					effects: [
						{
							type: 'action',
							method: 'perform',
							params: {
								amount: 6,
								resourceId: 'resource.gold',
								developmentId: 'development.gamma',
								logToken: 'log:install',
								logLabel: 'Install Development',
								source: 'actions-panel',
								slot: 'primary-slot',
								id: 'development.gamma',
								actionId: installOption.actionId,
								__actionId: installOption.actionId,
							},
						},
					],
					params: {
						amount: 6,
						resourceId: 'resource.gold',
						developmentId: 'development.gamma',
						logToken: 'log:install',
						logLabel: 'Install Development',
						source: 'actions-panel',
						slot: 'primary-slot',
						id: 'development.gamma',
					},
				},
				params: {
					amount: 6,
					resourceId: 'resource.gold',
					logToken: 'log:install',
					logLabel: 'Install Development',
					developmentId: 'development.gamma',
				},
			},
		]);
	});

	it('throws when an unknown option id is provided', () => {
		const { action, group } = createActionFixtures();
		const registry = new Registry<typeof action>();
		registry.add(action.id, action);

		expect(() =>
			resolveActionEffects(registry.get(action.id), {
				amount: 2,
				resourceId: 'resource.iron',
				choices: {
					[group.id]: {
						optionId: 'missing-option',
					},
				},
			}),
		).toThrowError(
			`Unknown option "missing-option" for effect group "${group.id}" ` +
				`on action ${action.id}`,
		);
	});
});
