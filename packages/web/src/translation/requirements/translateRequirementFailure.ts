import type { SessionRequirementFailure } from '@kingdom-builder/protocol';
import type { TranslationContext } from '../context';
import {
	selectPopulationRoleDisplay,
	selectSlotDisplay,
	selectStatDisplay,
} from '../context/assetSelectors';

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
	params: Record<string, unknown> | undefined,
	context: TranslationContext,
): OperandDescription {
	const resourceId = params?.['resourceId'];
	if (typeof resourceId === 'string') {
		const stat = selectStatDisplay(context.assets, resourceId);
		if (stat.icon) {
			return { icon: stat.icon, label: stat.label };
		}
		return { label: stat.label };
	}
	return { label: 'Stat' };
}

function describePopulationOperand(
	params: Record<string, unknown> | undefined,
	context: TranslationContext,
): OperandDescription {
	const resourceId = params?.['resourceId'];
	const descriptor = selectPopulationRoleDisplay(
		context.assets,
		typeof resourceId === 'string' ? resourceId : undefined,
	);
	if (descriptor.icon) {
		return { icon: descriptor.icon, label: descriptor.label };
	}
	return { label: descriptor.label };
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

function isLandOperand(operand: CompareOperand | undefined): boolean {
	if (!operand || typeof operand === 'number') {
		return false;
	}
	return operand.type === 'land';
}

function describeLandRequirement(context: TranslationContext): string {
	const slot = selectSlotDisplay(context.assets);
	const parts = [slot.icon, slot.label].filter(Boolean);
	const detail = parts.join(' ').trim() || 'Development Slot';
	return `Must have at least one available ${detail}`;
}

function formatOperand(
	operand: CompareOperand | undefined,
	context: TranslationContext,
	actual: unknown,
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
	const resourceId = operand.params?.['resourceId'];
	return typeof resourceId !== 'string';
}

function isMaxPopulationStat(operand: CompareOperand | undefined): boolean {
	if (!operand || typeof operand === 'number') {
		return false;
	}
	if (operand.type !== 'stat') {
		return false;
	}
	const resourceId = operand.params?.['resourceId'];
	return resourceId === 'maxPopulation';
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
	if (params.operator === 'gt' && isLandOperand(leftOperand)) {
		const rightNumber =
			typeof rightOperand === 'number' ? rightOperand : undefined;
		if (rightNumber === 0) {
			return describeLandRequirement(context);
		}
	}
	if (
		params.operator === 'lt' &&
		isGenericPopulation(leftOperand) &&
		isMaxPopulationStat(rightOperand)
	) {
		const leftValue = failure.details?.['left'];
		const rightValue = failure.details?.['right'];
		const current = typeof leftValue === 'number' ? leftValue : undefined;
		const capacity = typeof rightValue === 'number' ? rightValue : undefined;
		const stat = selectStatDisplay(context.assets, 'maxPopulation');
		const prefix = stat.icon ? `${stat.icon} ` : '';
		if (typeof current === 'number' && typeof capacity === 'number') {
			return `${prefix}Population is at capacity (${current}/${capacity})`;
		}
		return `${prefix}Population is at capacity`;
	}
	const left = formatOperand(leftOperand, context, failure.details?.['left']);
	const right = formatOperand(
		rightOperand,
		context,
		failure.details?.['right'],
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
