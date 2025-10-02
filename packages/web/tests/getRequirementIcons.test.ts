import { describe, expect, it } from 'vitest';
import {
	getRequirementIcons,
	registerRequirementIconGetter,
} from '../src/utils/getRequirementIcons';
import type { EngineContext } from '@kingdom-builder/engine';
import { POPULATION_ROLES, STATS } from '@kingdom-builder/contents';

const createEngineContext = (requirements: unknown[]): EngineContext =>
	({
		actions: new Map([
			[
				'test-action',
				{
					requirements,
				},
			],
		]),
	}) as unknown as EngineContext;

describe('getRequirementIcons', () => {
	it('includes icons derived from evaluator compare requirements', () => {
		const statEntry = Object.entries(STATS).find(([, value]) =>
			Boolean(value.icon),
		);
		const populationEntry = Object.entries(POPULATION_ROLES).find(([, value]) =>
			Boolean(value.icon),
		);
		expect(statEntry).toBeDefined();
		expect(populationEntry).toBeDefined();

		const [statKey, statConfig] = statEntry!;
		const [populationId, populationConfig] = populationEntry!;

		const engineContext = createEngineContext([
			{
				type: 'evaluator',
				method: 'compare',
				params: {
					left: {
						type: 'stat',
						params: { key: statKey },
					},
					right: {
						type: 'population',
						params: { role: populationId },
					},
				},
			},
		]);

		const icons = getRequirementIcons('test-action', engineContext);
		expect(icons).toContain(statConfig.icon);
		expect(icons).toContain(populationConfig.icon);
	});

	it('allows registering custom requirement icon handlers', () => {
		const unregister = registerRequirementIconGetter('mock', 'handler', () => [
			'🧪',
		]);
		const engineContext = createEngineContext([
			{
				type: 'mock',
				method: 'handler',
				params: {},
			},
		]);

		const icons = getRequirementIcons('test-action', engineContext);
		expect(icons).toContain('🧪');

		unregister();
	});
});
