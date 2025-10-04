import { useMemo } from 'react';
import {
	getActionCosts,
	getActionRequirements,
	type ActionEffectGroup,
	type ActionEffectGroupOption,
	type EngineContext,
} from '@kingdom-builder/engine';
import {
	describeContent,
	splitSummary,
	summarizeContent,
} from '../../translation';
import { type ActionCardOption } from './ActionCard';
import type { HoverCardData } from './types';
import { deriveActionOptionLabel } from '../../translation/effects/optionLabel';

type ResolveParams = Record<string, unknown> | undefined;

type BuildOptionsParams = {
	currentGroup: ActionEffectGroup | undefined;
	pendingParams: Record<string, unknown> | undefined;
	context: EngineContext;
	formatRequirement: (requirement: string) => string;
	handleOptionSelect: (
		group: ActionEffectGroup,
		option: ActionEffectGroupOption,
	) => void;
	clearHoverCard: () => void;
	handleHoverCard: (data: HoverCardData) => void;
	hoverBackground: string;
};

function resolveOptionParams(
	option: ActionEffectGroupOption,
	pendingParams: Record<string, unknown> | undefined,
): Record<string, unknown> {
	const base: Record<string, unknown> = {};
	const params: ResolveParams = option.params;
	if (!params) {
		return base;
	}
	for (const [key, value] of Object.entries(params)) {
		if (typeof value === 'string' && value.startsWith('$') && pendingParams) {
			const placeholder = value.slice(1);
			if (placeholder in pendingParams) {
				base[key] = pendingParams[placeholder];
				continue;
			}
		}
		base[key] = value;
	}
	return base;
}

function buildHoverDetails(
	option: ActionEffectGroupOption,
	mergedParams: Record<string, unknown>,
	context: EngineContext,
	formatRequirement: (requirement: string) => string,
	hoverBackground: string,
	optionLabel: string,
): HoverCardData {
	const hoverTitle = optionLabel.trim() || option.label;
	const hoverSummary = describeContent(
		'action',
		option.actionId,
		context,
		mergedParams,
	);
	const { effects, description } = splitSummary(hoverSummary);
	const requirements = getActionRequirements(
		option.actionId,
		context,
		mergedParams,
	).map(formatRequirement);
	const costBag = getActionCosts(option.actionId, context, mergedParams);
	const costs: Record<string, number> = {};
	for (const [resourceKey, cost] of Object.entries(costBag)) {
		costs[resourceKey] = cost ?? 0;
	}
	return {
		title: hoverTitle,
		effects,
		...(description && { description }),
		requirements,
		costs,
		bgClass: hoverBackground,
	};
}

export function useEffectGroupOptions({
	currentGroup,
	pendingParams,
	context,
	formatRequirement,
	handleOptionSelect,
	clearHoverCard,
	handleHoverCard,
	hoverBackground,
}: BuildOptionsParams): ActionCardOption[] | undefined {
	return useMemo(() => {
		if (!currentGroup) {
			return undefined;
		}
		return currentGroup.options.map((option) => {
			const resolved = resolveOptionParams(option, pendingParams);
			const mergedParams: Record<string, unknown> = {
				...(pendingParams ?? {}),
				...resolved,
			};
			const summaryEntries = summarizeContent(
				'action',
				option.actionId,
				context,
				mergedParams,
			);
			const optionLabel = deriveActionOptionLabel(
				option,
				context,
				summaryEntries,
			);
			const card: ActionCardOption = {
				id: option.id,
				label: optionLabel,
				onSelect: () => {
					clearHoverCard();
					handleOptionSelect(currentGroup, option);
				},
				compact: currentGroup.layout === 'compact',
			};
			if (option.summary) {
				card.summary = option.summary;
			}
			if (option.description) {
				card.description = option.description;
			}
			card.onMouseEnter = () => {
				const hoverDetails = buildHoverDetails(
					option,
					mergedParams,
					context,
					formatRequirement,
					hoverBackground,
					optionLabel,
				);
				handleHoverCard(hoverDetails);
			};
			card.onMouseLeave = clearHoverCard;
			return card;
		});
	}, [
		clearHoverCard,
		context,
		currentGroup,
		formatRequirement,
		handleHoverCard,
		handleOptionSelect,
		hoverBackground,
		pendingParams,
	]);
}
