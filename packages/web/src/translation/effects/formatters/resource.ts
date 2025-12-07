import { registerEffectFormatter } from '../factory';
import type { TranslationResourceMetadata } from '../../context/types';

// Extract resourceId from format - check direct param, then donor/recipient
function getResourceId(params: Record<string, unknown> | undefined): string {
	// Direct resourceId (add/remove effects)
	const resourceId = params?.['resourceId'];
	if (typeof resourceId === 'string') {
		return resourceId;
	}
	// Transfer effects have resourceId inside donor/recipient
	const donor = params?.['donor'] as { resourceId?: string } | undefined;
	if (typeof donor?.resourceId === 'string') {
		return donor.resourceId;
	}
	const recipient = params?.['recipient'] as
		| { resourceId?: string }
		| undefined;
	if (typeof recipient?.resourceId === 'string') {
		return recipient.resourceId;
	}
	return '';
}

// Extract amount from change format only
function getChangeAmount(params: Record<string, unknown> | undefined): number {
	const change = params?.['change'] as { amount?: number } | undefined;
	return Number(change?.amount ?? 0);
}

// Format signed value with metadata-driven percent handling
function formatSignedValue(
	amount: number,
	metadata: TranslationResourceMetadata,
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

// Append format suffix (like "Max" for maxPopulation) to content
function appendFormatSuffix(
	format: TranslationResourceMetadata['format'],
	content: string,
): string {
	if (!format || typeof format === 'string') {
		return content;
	}
	const suffix = typeof format.prefix === 'string' ? format.prefix.trim() : '';
	if (!suffix) {
		return content;
	}
	return `${content} ${suffix}`.trim();
}

registerEffectFormatter('resource', 'add', {
	summarize: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		const metadata = context.resourceMetadata.get(resourceId);
		const icon = metadata.icon?.trim() ?? '';
		const change = formatSignedValue(amount, metadata);
		const subject = icon || metadata.label || resourceId;
		return appendFormatSuffix(metadata.format, `${subject} ${change}`);
	},
	describe: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		const metadata = context.resourceMetadata.get(resourceId);
		const icon = metadata.icon?.trim() ?? '';
		const change = formatSignedValue(amount, metadata);
		if (icon) {
			return `${icon} ${change} ${metadata.label}`;
		}
		return `${change} ${metadata.label}`;
	},
});

registerEffectFormatter('resource', 'remove', {
	summarize: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		const metadata = context.resourceMetadata.get(resourceId);
		const icon = metadata.icon?.trim() ?? '';
		const change = formatSignedValue(-amount, metadata);
		const subject = icon || metadata.label || resourceId;
		return appendFormatSuffix(metadata.format, `${subject} ${change}`);
	},
	describe: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		const metadata = context.resourceMetadata.get(resourceId);
		const icon = metadata.icon?.trim() ?? '';
		const change = formatSignedValue(-amount, metadata);
		if (icon) {
			return `${icon} ${change} ${metadata.label}`;
		}
		return `${change} ${metadata.label}`;
	},
});

registerEffectFormatter('resource', 'transfer', {
	summarize: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const metadata = context.resourceMetadata.get(resourceId);
		const icon = metadata.icon ?? '';
		if (effect.params?.['amount'] !== undefined) {
			const amount = Number(effect.params['amount']);
			return `Transfer ${amount} ${icon}`;
		}
		const percent = Number(effect.params?.['percent']);
		return `Transfer ${percent}% ${icon}`;
	},
	describe: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const metadata = context.resourceMetadata.get(resourceId);
		const icon = metadata.icon ?? '';
		if (effect.params?.['amount'] !== undefined) {
			const amount = Number(effect.params['amount']);
			return `Transfer ${amount} of opponent's ${icon}${metadata.label} to you`;
		}
		const percent = Number(effect.params?.['percent']);
		return `Transfer ${percent}% of opponent's ${icon}${metadata.label} to you`;
	},
});
