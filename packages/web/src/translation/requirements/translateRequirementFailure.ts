import type { SessionRequirementFailure } from '@kingdom-builder/protocol';
import type { TranslationContext } from '../context';

type EvaluatorOperand = {
	type?: string;
	params?: Record<string, unknown>;
};

type CompareOperand = number | EvaluatorOperand;

type CompareParams = {
	left?: CompareOperand;
	right?: CompareOperand;
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
};

type OperandDescription = {
	icon?: string;
	label: string;
};

const MAX_POPULATION_KEY = 'maxPopulation';

function describeStatOperand(
	params: Record<string, unknown> | undefined,
	context: TranslationContext,
): OperandDescription {
	const key = params?.['key'];
	if (typeof key === 'string') {
		const descriptor = context.assets.stats[key];
		if (descriptor) {
			return {
				icon: descriptor.icon,
				label: descriptor.label ?? key,
			};
		}
	}
	return { label: 'Stat' };
}

function describePopulationOperand(
	params: Record<string, unknown> | undefined,
	context: TranslationContext,
): OperandDescription {
	const role = params?.['role'];
	if (typeof role === 'string') {
		const descriptor = context.assets.populations[role];
		if (descriptor) {
			return {
				icon: descriptor.icon,
				label: descriptor.label ?? role,
			};
		}
	}
	return {
		icon: context.assets.population.icon,
		label: context.assets.population.label ?? 'Population',
	};
}

function describeEvaluatorOperand(
	operand: CompareOperand | undefined,
	context: TranslationContext,
): OperandDescription {
	if (!operand || typeof operand === 'number') {
		return { label: 'Value' };
	}
	switch (operand.type) {
		case 'stat':
			return describeStatOperand(operand.params, context);
		case 'population':
			return describePopulationOperand(operand.params, context);
		default:
			return { label: operand.type ?? 'Value' };
	}
}

function formatOperand(
	operand: CompareOperand | undefined,
	actual: unknown,
	context: TranslationContext,
): string {
	if (typeof operand === 'number') {
		return `${operand}`;
	}
	const { icon, label } = describeEvaluatorOperand(operand, context);
	const base = [icon, label].filter(Boolean).join(' ').trim() || 'Value';
	if (typeof actual === 'number') {
		return `${base} (${actual})`;
	}
	return base;
}

function isGenericPopulation(operand: CompareOperand | undefined): boolean {
	if (!operand || typeof operand === 'number') {
		return false;
	}
	if (operand.type !== 'population') {
		return false;
	}
	const role = operand.params?.['role'];
	return typeof role !== 'string';
}

function isMaxPopulationStat(operand: CompareOperand | undefined): boolean {
	if (!operand || typeof operand === 'number') {
		return false;
	}
	if (operand.type !== 'stat') {
		return false;
	}
	const key = operand.params?.['key'];
	return key === MAX_POPULATION_KEY;
}

function operatorPhrase(operator: CompareParams['operator']): string {
	switch (operator) {
		case 'lt':
			return 'must be lower than';
		case 'lte':
			return 'must be at most';
		case 'gt':
			return 'must be greater than';
		case 'gte':
			return 'must be at least';
		case 'eq':
			return 'must be';
		case 'ne':
			return 'must not equal';
		default:
			return 'must satisfy';
	}
}

function translateCompareRequirement(
	failure: SessionRequirementFailure,
	context: TranslationContext,
): string {
	const params = (failure.requirement.params ?? {}) as CompareParams;
	const leftOperand = params.left;
	const rightOperand = params.right;
	if (
		params.operator === 'lt' &&
		isGenericPopulation(leftOperand) &&
		isMaxPopulationStat(rightOperand)
	) {
		const leftValue = failure.details?.['left'];
		const rightValue = failure.details?.['right'];
		const current = typeof leftValue === 'number' ? leftValue : undefined;
		const capacity = typeof rightValue === 'number' ? rightValue : undefined;
		const descriptor = context.assets.stats[MAX_POPULATION_KEY];
		const prefix = descriptor?.icon ? `${descriptor.icon} ` : '';
		if (typeof current === 'number' && typeof capacity === 'number') {
			return `${prefix}Population is at capacity (${current}/${capacity})`;
		}
		return `${prefix}Population is at capacity`;
	}
	const left = formatOperand(leftOperand, failure.details?.['left'], context);
	const right = formatOperand(
		rightOperand,
		failure.details?.['right'],
		context,
	);
	const phrase = operatorPhrase(params.operator);
	return `${left} ${phrase} ${right}`.trim();
}

export function translateRequirementFailure(
	failure: SessionRequirementFailure,
	context: TranslationContext,
): string {
	const { requirement } = failure;
	if (requirement.type === 'evaluator' && requirement.method === 'compare') {
		return translateCompareRequirement(failure, context);
	}
	return failure.message ?? 'Requirement not met';
}
