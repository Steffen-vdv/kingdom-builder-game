import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { SummaryEntry } from '../../content';
import type { TranslationContext } from '../../context';
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

// Extract passive ID from a passive:add or passive:remove effect
function getPassiveId(effect: EffectDef): string | undefined {
	if (effect.type !== 'passive') {
		return undefined;
	}
	const id = effect.params?.['id'];
	return typeof id === 'string' ? id : undefined;
}

// Check if a passive:add effect has a matching passive:remove in onValueDecrease
function isPassivePaired(
	addEffect: EffectDef,
	decreaseEffects: readonly EffectDef[],
): boolean {
	const addId = getPassiveId(addEffect);
	if (!addId || addEffect.method !== 'add') {
		return false;
	}
	return decreaseEffects.some((removeEffect) => {
		if (removeEffect.type !== 'passive' || removeEffect.method !== 'remove') {
			return false;
		}
		return getPassiveId(removeEffect) === addId;
	});
}

// Format trigger effects with appropriate hierarchy
function formatTriggerEffects(
	triggerEffects: readonly EffectDef[],
	decreaseEffects: readonly EffectDef[],
	context: TranslationContext,
	mode: 'summarize' | 'describe',
): SummaryEntry[] {
	const results: SummaryEntry[] = [];
	const formatFn = mode === 'summarize' ? summarizeEffects : describeEffects;

	for (const triggerEffect of triggerEffects) {
		// For passive:add effects, check if paired with passive:remove
		if (triggerEffect.type === 'passive' && triggerEffect.method === 'add') {
			const isPaired = isPassivePaired(triggerEffect, decreaseEffects);
			// Format the inner effects of the passive
			const innerEffects = triggerEffect.effects ?? [];
			const innerFormatted = formatFn(innerEffects, context);

			if (isPaired && innerFormatted.length > 0) {
				// Show as conditional with "while active" qualifier
				for (const entry of innerFormatted) {
					if (typeof entry === 'string') {
						results.push(`${entry} (while active)`);
					} else {
						results.push({
							...entry,
							title: `${entry.title} (while active)`,
						});
					}
				}
			} else {
				// Show as sibling (permanent effect)
				results.push(...innerFormatted);
			}
		} else {
			// Non-passive effects: format directly
			results.push(...formatFn([triggerEffect], context));
		}
	}
	return results;
}

registerEffectFormatter('resource', 'add', {
	summarize: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		const metadata = context.resourceMetadata.get(resourceId);
		const icon = metadata.icon?.trim() ?? '';
		const change = formatSignedValue(amount, metadata);
		const subject = icon || metadata.label || resourceId;
		const mainEntry = appendFormatSuffix(metadata.format, `${subject} ${change}`);

		// Look up resource definition for triggers
		const resourceDef = context.resources.resources.byId[resourceId];
		const increaseEffects = resourceDef?.onValueIncrease ?? [];
		const decreaseEffects = resourceDef?.onValueDecrease ?? [];

		if (increaseEffects.length === 0) {
			return mainEntry;
		}

		// Format trigger effects as sub-bullets
		const triggerItems = formatTriggerEffects(
			increaseEffects,
			decreaseEffects,
			context,
			'summarize',
		);

		if (triggerItems.length === 0) {
			return mainEntry;
		}

		return { title: mainEntry, items: triggerItems };
	},
	describe: (effect, context) => {
		const resourceId = getResourceId(effect.params);
		const amount = getChangeAmount(effect.params);
		const metadata = context.resourceMetadata.get(resourceId);
		const icon = metadata.icon?.trim() ?? '';
		const change = formatSignedValue(amount, metadata);
		const mainEntry = icon
			? `${icon} ${change} ${metadata.label}`
			: `${change} ${metadata.label}`;

		// Look up resource definition for triggers
		const resourceDef = context.resources.resources.byId[resourceId];
		const increaseEffects = resourceDef?.onValueIncrease ?? [];
		const decreaseEffects = resourceDef?.onValueDecrease ?? [];

		if (increaseEffects.length === 0) {
			return mainEntry;
		}

		// Format trigger effects as sub-bullets
		const triggerItems = formatTriggerEffects(
			increaseEffects,
			decreaseEffects,
			context,
			'describe',
		);

		if (triggerItems.length === 0) {
			return mainEntry;
		}

		return { title: mainEntry, items: triggerItems };
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
