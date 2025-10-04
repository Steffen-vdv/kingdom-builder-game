import { Operators } from '@kingdom-builder/engine/evaluators/compare';

export const compareRequirement = (left: unknown, right: unknown) => ({
	type: 'evaluator',
	method: 'compare',
	params: { left, operator: Operators.LessThan, right },
});

export const populationEvaluator = (role?: string) => ({
	type: 'population',
	params: role ? { role } : {},
});

export const statEvaluator = (key: string) => ({
	type: 'stat',
	params: { key },
});
