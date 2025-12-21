import type {
	ForecastContribution,
	ResourceForecastBreakdown,
} from '@kingdom-builder/protocol';
import type { Summary, SummaryGroup } from '../translation/content/types';
import type { TranslationContext } from '../translation/context';
import { formatResourceValue } from './resourceSources/descriptors';

/**
 * Resolve a label for a forecast contribution source.
 * Uses the kind property to look up metadata from the appropriate registry.
 */
function resolveContributionLabel(
	contribution: ForecastContribution,
	context: TranslationContext,
): string {
	const { kind, id } = contribution;

	if (!id) {
		return contribution.sourceKey;
	}

	// Look up based on kind property (the architectural contract)
	switch (kind) {
		case 'building':
			if (context.buildings.has(id)) {
				const building = context.buildings.get(id);
				return building.icon
					? `${building.icon} ${building.name}`
					: building.name;
			}
			break;

		case 'development':
			if (context.developments.has(id)) {
				const development = context.developments.get(id);
				return development.icon
					? `${development.icon} ${development.name}`
					: development.name;
			}
			break;

		case 'phase': {
			const phase = context.phases?.find((phaseEntry) => phaseEntry.id === id);
			if (phase?.label) {
				return phase.icon ? `${phase.icon} ${phase.label}` : phase.label;
			}
			break;
		}

		case 'passive':
		case 'resource': {
			const resource = context.assets.resources?.[id];
			if (resource?.label) {
				return resource.icon
					? `${resource.icon} ${resource.label}`
					: resource.label;
			}
			break;
		}
	}

	// Fallback: format the id as a readable string
	return formatIdAsLabel(id);
}

/**
 * Format a content ID as a human-readable label.
 * Handles patterns like "building:core:farm" -> "Farm"
 */
function formatIdAsLabel(id: string): string {
	// Extract the last segment after the last colon
	const segments = id.split(':');
	const lastSegment = segments[segments.length - 1] ?? id;

	// Convert kebab-case or snake_case to Title Case
	return lastSegment
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format a single contribution as a string entry for the summary.
 */
function formatContribution(
	resourceId: string,
	contribution: ForecastContribution,
	context: TranslationContext,
): string {
	const label = resolveContributionLabel(contribution, context);
	const valueText = formatResourceValue(
		resourceId,
		Math.abs(contribution.amount),
		context.assets,
	);
	const sign = contribution.amount >= 0 ? '+' : '-';

	// Get resource icon if available
	const resourceInfo = context.assets.resources?.[resourceId];
	const icon = resourceInfo?.icon ?? '';

	const parts: string[] = [];
	if (icon) {
		parts.push(icon);
	}
	parts.push(`${sign}${valueText}`);
	parts.push(`from ${label}`);

	return parts.join(' ');
}

/**
 * Build a Summary for forecast breakdown display.
 * Structured as: Gains section, Losses section, Net total.
 */
export function getForecastBreakdownSummary(
	resourceId: string,
	breakdown: ResourceForecastBreakdown,
	context: TranslationContext,
): Summary {
	const { gains, losses, net } = breakdown;

	// If no contributors, return empty (caller should hide breakdown)
	if (gains.length === 0 && losses.length === 0) {
		return [];
	}

	const summary: Summary = [];

	// Gains section
	if (gains.length > 0) {
		const gainEntries = gains.map((contribution) =>
			formatContribution(resourceId, contribution, context),
		);
		const gainsGroup: SummaryGroup = {
			title: 'Gains',
			items: gainEntries,
		};
		summary.push(gainsGroup);
	}

	// Losses section
	if (losses.length > 0) {
		const lossEntries = losses.map((contribution) =>
			formatContribution(resourceId, contribution, context),
		);
		const lossesGroup: SummaryGroup = {
			title: 'Losses',
			items: lossEntries,
		};
		summary.push(lossesGroup);
	}

	// Net total
	const resourceInfo = context.assets.resources?.[resourceId];
	const icon = resourceInfo?.icon ?? '';
	const netValueText = formatResourceValue(
		resourceId,
		Math.abs(net),
		context.assets,
	);
	const netSign = net > 0 ? '+' : net < 0 ? '-' : '';
	const netText = icon
		? `${icon} ${netSign}${netValueText} net`
		: `${netSign}${netValueText} net`;

	const netGroup: SummaryGroup = {
		title: 'Net',
		items: [netText],
	};
	summary.push(netGroup);

	return summary;
}
