import { describe, it, expect } from 'vitest';
import type { EvaluatorDef } from '@kingdom-builder/protocol';
import { PopulationRole, Stat } from '@kingdom-builder/contents';
import {
	collectEvaluatorDependencies,
	evaluatorDependencyCollectorRegistry,
	registerEvaluatorDependencyCollector,
} from '../src/stat_sources/index.ts';

describe('evaluator dependency collectors', () => {
	it('returns empty collections when evaluators are missing or unsupported', () => {
		const unknownEvaluator: EvaluatorDef = { type: 'unknown', params: {} };
		const blankPopulation: EvaluatorDef = {
			type: 'population',
			params: { role: '   ' },
		};
		const blankDevelopment: EvaluatorDef = {
			type: 'development',
			params: { id: ' ' },
		};
		const blankStat: EvaluatorDef = { type: 'stat', params: { key: '' } };
		expect(collectEvaluatorDependencies(undefined)).toEqual([]);
		expect(collectEvaluatorDependencies(unknownEvaluator)).toEqual([]);
		expect(collectEvaluatorDependencies(blankPopulation)).toEqual([]);
		expect(collectEvaluatorDependencies(blankDevelopment)).toEqual([]);
		expect(collectEvaluatorDependencies(blankStat)).toEqual([]);
	});

	it('combines nested compare dependencies and skips numeric branches', () => {
		const compareEvaluator: EvaluatorDef = {
			type: 'compare',
			params: {
				left: {
					type: 'population',
					params: { role: ` ${PopulationRole.Legion} ` },
				},
				right: {
					type: 'compare',
					params: {
						left: 5,
						right: {
							type: 'stat',
							params: { key: ` ${Stat.armyStrength} ` },
						},
					},
				},
			},
		};
		expect(collectEvaluatorDependencies(compareEvaluator)).toEqual([
			{ type: 'population', id: PopulationRole.Legion },
			{ type: 'stat', id: Stat.armyStrength },
		]);
	});

	it('allows temporary collectors for custom evaluator types', () => {
		const type = 'custom-evaluator';
		const evaluator: EvaluatorDef = {
			type: type,
			params: { id: 'unique', detail: 'custom' },
		};
		registerEvaluatorDependencyCollector(type, (definition) => {
			const params = definition.params as Record<string, string> | undefined;
			if (!params?.id) {
				return [];
			}
			return [
				{
					type: 'custom',
					id: params.id,
					detail: params.detail,
				},
			];
		});
		expect(collectEvaluatorDependencies(evaluator)).toEqual([
			{ type: 'custom', id: 'unique', detail: 'custom' },
		]);
		evaluatorDependencyCollectorRegistry.delete(type);
	});
	it('ignores invalid evaluator parameter shapes', () => {
		const invalidPopulation: EvaluatorDef = {
			type: 'population',
			params: null as unknown as Record<string, unknown>,
		};
		const invalidStat: EvaluatorDef = {
			type: 'stat',
			params: [] as unknown as Record<string, unknown>,
		};
		const invalidCompare: EvaluatorDef = {
			type: 'compare',
			params: [] as unknown as Record<string, unknown>,
		};
		const missingCompareSides: EvaluatorDef = {
			type: 'compare',
			params: {},
		};
		expect(collectEvaluatorDependencies(invalidPopulation)).toEqual([]);
		expect(collectEvaluatorDependencies(invalidStat)).toEqual([]);
		expect(collectEvaluatorDependencies(invalidCompare)).toEqual([]);
		expect(collectEvaluatorDependencies(missingCompareSides)).toEqual([]);
	});
});
