import type { EffectDef, DevelopmentConfig } from '@kingdom-builder/protocol';
import { humanizeIdentifier } from '../stringUtils';
import type { TranslationContext } from '../../context';
import {
	selectResourceDescriptor,
	selectDevelopmentDescriptor,
	selectKeywordLabels,
} from '../registrySelectors';

const joinParts = (...parts: Array<string | undefined>) =>
	parts.filter(Boolean).join(' ').trim();

export const formatTargetLabel = (icon: string, name: string) =>
	joinParts(icon, name || '');

export interface ResultModifierLabel {
	icon: string;
	label: string;
}

export const formatPercentText = (percent: number) => {
	const scaled = Number((percent * 100).toFixed(2));
	const normalized = Object.is(scaled, -0) ? 0 : scaled;
	const sign = percent >= 0 ? '+' : '';
	return `${sign}${normalized}%`;
};

export const formatPercentMagnitude = (percent: number) => {
	const scaled = Number((Math.abs(percent) * 100).toFixed(2));
	return Object.is(scaled, -0) ? 0 : scaled;
};

export const parseNumericParam = (value: unknown) => {
	if (typeof value === 'number') {
		return Number.isNaN(value) ? undefined : value;
	}
	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isNaN(parsed) ? undefined : parsed;
	}
	return undefined;
};

/**
 * Gets development info for a specific development ID, or returns the generic
 * development keyword for "all developments" when ID is empty/undefined.
 */
function getDevelopmentTarget(
	context: TranslationContext,
	evaluationId: string | undefined,
): { icon: string; name: string; isGlobal: boolean } {
	// Empty/undefined evaluation ID means "all developments"
	if (!evaluationId || evaluationId.trim() === '') {
		const keyword = selectDevelopmentDescriptor(context);
		return {
			icon: keyword.icon,
			name: `All ${keyword.plural}`,
			isGlobal: true,
		};
	}
	// Specific development
	const info = getDevelopmentInfo(context, evaluationId);
	return { ...info, isGlobal: false };
}

/**
 * Formats development modifier (Resource Gain) with simplified output:
 * - Summary: `✨🌾: +🪙1 Resource Gain` or `✨🏗️: +50% Resource Gain`
 * - Describe: `✨🌾 Farm: +🪙1 Resource Gain` or
 *   `✨🏗️ All Developments: +50% Resource Gain (rounded up)`
 */
export function formatDevelopment(
	label: ResultModifierLabel,
	effectDefinition: EffectDef,
	evaluation: { id: string },
	context: TranslationContext,
	detailed: boolean,
): string {
	const target = getDevelopmentTarget(context, evaluation.id);
	const keywords = selectKeywordLabels(context);

	// Extract resource and amount information
	const resourceEffect = effectDefinition.effects?.find(
		(nestedEffect): nestedEffect is EffectDef =>
			nestedEffect.type === 'resource' &&
			(nestedEffect.method === 'add' || nestedEffect.method === 'remove'),
	);

	let resourceIcon = '';
	let amount = 0;
	let usePercent = false;
	let round: 'up' | 'down' | undefined;

	if (resourceEffect) {
		const resourceId = resourceEffect.params?.['resourceId'] as
			| string
			| undefined;
		if (resourceId) {
			const descriptor = selectResourceDescriptor(context, resourceId);
			// Use icon only if it exists and is not empty; otherwise leave blank
			resourceIcon =
				descriptor?.icon && descriptor.icon.trim().length > 0
					? descriptor.icon
					: '';
		}
		const changeObj = resourceEffect.params?.['change'] as
			| { amount?: number }
			| undefined;
		const rawAmount = Number(changeObj?.amount ?? 0);
		amount = resourceEffect.method === 'remove' ? -rawAmount : rawAmount;
	} else {
		// Check for percent-based modifier
		const percentParam = effectDefinition.params?.['percent'];
		if (percentParam !== undefined) {
			usePercent = true;
			amount = Number(percentParam);
			round =
				effectDefinition.round === 'down' || effectDefinition.round === 'up'
					? effectDefinition.round
					: undefined;
		} else {
			amount = Number(effectDefinition.params?.['amount'] ?? 0);
		}
	}

	// Format the value text
	const signChar = amount >= 0 ? '+' : '-';
	const absolute = Math.abs(amount);
	let valueText: string;
	if (usePercent) {
		const magnitude = formatPercentMagnitude(amount);
		valueText = `${signChar}${magnitude}%`;
	} else {
		valueText = resourceIcon
			? `${signChar}${resourceIcon}${absolute}`
			: `${signChar}${absolute}`;
	}

	// Rounding detail for percent modifiers
	const roundingDetail =
		usePercent && round ? ` (rounded ${round === 'down' ? 'down' : 'up'})` : '';

	// Build the output
	if (!detailed) {
		// Summary: ✨🌾: +🪙1 Resource Gain
		return `${label.icon}${target.icon}: ${valueText} ${keywords.resourceGain}${roundingDetail}`;
	}

	// Describe: ✨🌾 Farm: +🪙1 Resource Gain
	const targetLabel = formatTargetLabel(target.icon, target.name);
	return `${label.icon}${targetLabel}: ${valueText} ${keywords.resourceGain}${roundingDetail}`;
}

export function getDevelopmentInfo(
	translationContext: TranslationContext,
	id: string,
): { icon: string; name: string } {
	try {
		const developmentDefinition: DevelopmentConfig =
			translationContext.developments.get(id);
		return {
			icon: developmentDefinition.icon ?? '',
			name: developmentDefinition.name ?? id,
		};
	} catch {
		return { icon: '', name: humanizeIdentifier(id) || id };
	}
}
