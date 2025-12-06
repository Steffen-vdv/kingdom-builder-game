import { registerEffectFormatter } from '../factory';
import { gainOrLose } from '../helpers';
import type { TranslationContext } from '../../context';
import type { TranslationResourceV2Metadata } from '../../context/types';

// Extract resourceId from V2 format params
function getResourceId(params: Record<string, unknown> | undefined): string {
	const resourceId = params?.['resourceId'];
	if (typeof resourceId === 'string') {
		return resourceId;
	}
	return '';
}

// Get change amount from V2 change format
function getChangeAmount(params: Record<string, unknown> | undefined): number {
	const change = params?.['change'] as { amount?: number } | undefined;
	if (typeof change?.amount === 'number') {
		return change.amount;
	}
	return 1;
}

// Format signed value using V2 metadata
function formatSignedValue(
	amount: number,
	metadata: TranslationResourceV2Metadata,
): string {
	const usesPercent =
		metadata.displayAsPercent === true ||
		(typeof metadata.format === 'object' && metadata.format?.percent === true);
	const resolvedAmount = usesPercent
		? Number((amount * 100).toFixed(2))
		: amount;
	const sign = resolvedAmount >= 0 ? '+' : '-';
	const magnitude = Math.abs(resolvedAmount);
	const suffix = usesPercent ? '%' : '';
	return `${sign}${magnitude}${suffix}`;
}

function formatSummary(
	resourceId: string,
	amount: number,
	context: TranslationContext,
): string {
	const metadata = context.resourceMetadataV2.get(resourceId);
	const icon = metadata.icon?.trim() ?? '';
	const change = formatSignedValue(amount, metadata);
	const subject = icon || metadata.label || resourceId;
	return `${subject} ${change}`;
}

function formatDescription(
	resourceId: string,
	amount: number,
	context: TranslationContext,
): string {
	const metadata = context.resourceMetadataV2.get(resourceId);
	const icon = metadata.icon?.trim() ?? '';
	const verb = gainOrLose(amount);
	const magnitude = Math.abs(amount);
	const display = icon ? `${icon} ${metadata.label}` : metadata.label;
	return `${verb} ${magnitude} ${display}`;
}

registerEffectFormatter('population', 'add', {
	summarize: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		return formatSummary(resourceId, amount, context);
	},
	describe: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		return formatDescription(resourceId, amount, context);
	},
});

registerEffectFormatter('population', 'remove', {
	summarize: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		return formatSummary(resourceId, -amount, context);
	},
	describe: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		return formatDescription(resourceId, -amount, context);
	},
});
