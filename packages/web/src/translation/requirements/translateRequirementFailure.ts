import {
	POPULATION_INFO,
	POPULATION_ROLES,
	STATS,
	Stat,
	type PopulationRoleId,
	type StatKey,
} from '@kingdom-builder/contents';
import type { RequirementFailure } from '@kingdom-builder/engine';

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

function describeStatOperand(
	params?: Record<string, unknown>,
): OperandDescription {
	const key = params?.['key'];
	if (typeof key === 'string') {
		const stat = STATS[key as StatKey];
		if (stat) {
			return {
				icon: stat.icon,
				label: stat.label ?? key,
			};
		}
	}
	return { label: 'Stat' };
}

function describePopulationOperand(
	params?: Record<string, unknown>,
): OperandDescription {
	const role = params?.['role'];
	if (typeof role === 'string') {
		const roleInfo = POPULATION_ROLES[role as PopulationRoleId];
		if (roleInfo) {
			return {
				icon: roleInfo.icon,
				label: roleInfo.label ?? role,
			};
		}
	}
	return {
		icon: POPULATION_INFO.icon,
		label: POPULATION_INFO.label,
	};
}

function describeEvaluatorOperand(
	operand: CompareOperand | undefined,
): OperandDescription {
	if (!operand || typeof operand === 'number') {
		return { label: 'Value' };
	}
	switch (operand.type) {
		case 'stat':
			return describeStatOperand(operand.params);
		case 'population':
			return describePopulationOperand(operand.params);
		default:
			return { label: operand.type ?? 'Value' };
	}
}

function formatOperand(
	operand: CompareOperand | undefined,
	actual: unknown,
): string {
	if (typeof operand === 'number') {
		return `${operand}`;
	}
	const { icon, label } = describeEvaluatorOperand(operand);
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
	return key === Stat.maxPopulation;
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

function translateCompareRequirement(failure: RequirementFailure): string {
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
		const stat = STATS[Stat.maxPopulation];
		const prefix = stat?.icon ? `${stat.icon} ` : '';
		if (typeof current === 'number' && typeof capacity === 'number') {
			return `${prefix}Population is at capacity (${current}/${capacity})`;
		}
		return `${prefix}Population is at capacity`;
	}
	const left = formatOperand(leftOperand, failure.details?.['left']);
	const right = formatOperand(rightOperand, failure.details?.['right']);
	const phrase = operatorPhrase(params.operator);
	return `${left} ${phrase} ${right}`.trim();
}

export function translateRequirementFailure(
	failure: RequirementFailure,
	_context: unknown,
): string {
	const { requirement } = failure;
	if (requirement.type === 'evaluator' && requirement.method === 'compare') {
		return translateCompareRequirement(failure);
	}
	return failure.message ?? 'Requirement not met';
}
