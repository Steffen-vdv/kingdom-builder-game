import type {
	SessionResourceGroupParentDescriptor,
	SessionResourceOrderedValueEntry,
	SessionResourceRecentChange,
	SessionResourceTierStatus,
	SessionResourceValueDescriptor,
	SessionResourceValueSnapshot,
} from '@kingdom-builder/protocol/session';
import { gainOrLose, signed as signedPrefix } from '../effects/helpers';

type TierStepSnapshot = NonNullable<SessionResourceTierStatus['steps']>[number];

interface NumberFormatOptions {
	readonly displayAsPercent?: boolean;
	readonly format?:
		| string
		| {
				prefix?: string;
				percent?: boolean;
		  };
}

function shouldFormatAsPercent(options: NumberFormatOptions): boolean {
	if (options.displayAsPercent) {
		return true;
	}
	if (typeof options.format === 'object') {
		return options.format.percent === true;
	}
	return false;
}

function resolvePrefix(options: NumberFormatOptions): string | undefined {
	if (typeof options.format === 'object') {
		return options.format.prefix;
	}
	return undefined;
}

function formatNumericValue(
	value: number,
	descriptor: NumberFormatOptions,
): string {
	const prefix = resolvePrefix(descriptor) ?? '';
	if (shouldFormatAsPercent(descriptor)) {
		const percentValue = value * 100;
		const formatted = percentValue.toLocaleString('en-US', {
			maximumFractionDigits: 2,
		});
		return `${prefix}${formatted}%`;
	}
	const formatted = value.toLocaleString('en-US', {
		maximumFractionDigits: 2,
	});
	return `${prefix}${formatted}`;
}

function formatBounds(
	snapshot: SessionResourceValueSnapshot,
): string | undefined {
	const parts: string[] = [];
	if (typeof snapshot.lowerBound === 'number') {
		parts.push(`min ${formatNumericValue(snapshot.lowerBound, {})}`);
	}
	if (typeof snapshot.upperBound === 'number') {
		parts.push(`max ${formatNumericValue(snapshot.upperBound, {})}`);
	}
	if (parts.length === 0) {
		return undefined;
	}
	return ` (${parts.join(', ')})`;
}

function iconPrefix(icon: string | undefined): string {
	return icon ? `${icon} ` : '';
}

export function formatResourceValue(
	descriptor: SessionResourceValueDescriptor,
	snapshot: SessionResourceValueSnapshot | undefined,
): string {
	const icon = iconPrefix(descriptor.icon);
	const label = descriptor.label ?? descriptor.id ?? 'Unknown';
	const value = formatNumericValue(snapshot?.value ?? 0, descriptor);
	const bounds = snapshot ? (formatBounds(snapshot) ?? '') : '';
	return `${icon}${label} ${value}${bounds}`;
}

function findStepLabel(
	steps: readonly TierStepSnapshot[] | undefined,
	stepId: string | undefined,
	fallbackIndex: number | undefined,
): string | undefined {
	if (!steps || steps.length === 0) {
		return stepId ?? undefined;
	}
	if (stepId) {
		const matchedById = steps.find((step) => step.id === stepId);
		if (matchedById) {
			return matchedById.label ?? matchedById.id;
		}
	}
	if (fallbackIndex === undefined) {
		return undefined;
	}
	const matchedByIndex = steps.find((step) => step.index === fallbackIndex);
	if (matchedByIndex) {
		return matchedByIndex.label ?? matchedByIndex.id;
	}
	return undefined;
}

function formatProgress(status: SessionResourceTierStatus): string | undefined {
	const progress = status.progress;
	if (!progress) {
		return undefined;
	}
	if (typeof progress.max === 'number') {
		return `${progress.current}/${progress.max}`;
	}
	return `${progress.current}`;
}

export function formatTierState(
	descriptor: SessionResourceValueDescriptor,
	status: SessionResourceTierStatus | undefined,
): string | undefined {
	if (!status) {
		return undefined;
	}
	const steps = status.steps;
	const currentLabel = findStepLabel(
		steps,
		status.currentStepId,
		status.currentStepIndex,
	);
	const nextLabel = findStepLabel(steps, status.nextStepId, undefined);
	const label = descriptor.label ?? descriptor.id ?? 'Unknown';
	const prefix = `${label} tier`;
	const progress = formatProgress(status);
	const currentPart = currentLabel ? `${currentLabel}` : undefined;
	const summaryParts: string[] = [];
	if (currentPart) {
		summaryParts.push(currentPart);
	}
	if (progress) {
		summaryParts.push(`(${progress})`);
	}
	let summary = summaryParts.join(' ');
	if (summary.length === 0) {
		summary = 'No tier progress';
	}
	if (nextLabel) {
		summary = `${summary} → ${nextLabel}`;
	}
	return `${prefix}: ${summary}`;
}

export function formatTierTransition(
	descriptor: SessionResourceValueDescriptor,
	status: SessionResourceTierStatus | undefined,
): string | undefined {
	if (!status) {
		return undefined;
	}
	const { previousStepId, currentStepId, steps } = status;
	if (!previousStepId || !currentStepId || previousStepId === currentStepId) {
		return undefined;
	}
	const previousLabel =
		findStepLabel(steps, previousStepId, undefined) ?? previousStepId;
	const currentLabel =
		findStepLabel(steps, currentStepId, undefined) ?? currentStepId;
	const label = descriptor.label ?? descriptor.id ?? 'Unknown';
	const transitionParts = [
		`${label} tier advanced from ${previousLabel}`,
		`to ${currentLabel}`,
	];
	return transitionParts.join(' ');
}

function formatSignedAmount(amount: number): string {
	const prefix = signedPrefix(amount);
	return `${prefix}${amount.toLocaleString('en-US', {
		maximumFractionDigits: 2,
	})}`;
}

export function formatRecentChange(
	descriptor: SessionResourceValueDescriptor,
	change: SessionResourceRecentChange,
): string {
	const verb = gainOrLose(change.amount);
	const icon = iconPrefix(descriptor.icon);
	const label = descriptor.label ?? descriptor.id ?? change.resourceId;
	const signedAmount = formatSignedAmount(change.amount);
	return `${verb} ${icon}${label} ${signedAmount}`;
}

export function formatGroupParent(
	parent: SessionResourceGroupParentDescriptor,
): string {
	const icon = iconPrefix(parent.icon);
	const label = parent.label ?? parent.id;
	const limited = parent.limited ? ' (limited)' : '';
	return `${icon}${label}${limited}`;
}

export function isGroupParentEntry(
	entry: SessionResourceOrderedValueEntry,
): entry is Extract<
	SessionResourceOrderedValueEntry,
	{ kind: 'group-parent' }
> {
	return entry.kind === 'group-parent';
}

export function isValueEntry(
	entry: SessionResourceOrderedValueEntry,
): entry is Extract<SessionResourceOrderedValueEntry, { kind: 'value' }> {
	return entry.kind === 'value';
}
