import { useEffect, useMemo, useState } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	translateRequirementFailure,
	type TranslationContext,
} from '../../translation';
import { type ActionCardOption } from './ActionCard';
import type { HoverCardData } from './types';
import { deriveActionOptionLabel } from '../../translation/effects/optionLabel';
import { useActionMetadata } from '../../state/useActionMetadata';
import {
	extractParagraph,
	extractPrimaryLine,
	resolveContentDetails,
	resolveContentTarget,
} from './optionContentDetails';

type OptionParams = ActionEffectGroupOption['params'];
type PendingParams = Record<string, unknown> | undefined;

type EffectGroupOptionsParams = {
	currentGroup: ActionEffectGroup | undefined;
	pendingParams: PendingParams;
	translationContext: TranslationContext;
	formatRequirement: (requirement: string) => string;
	handleOptionSelect: (
		group: ActionEffectGroup,
		option: ActionEffectGroupOption,
		params?: Record<string, unknown>,
	) => void;
	clearHoverCard: () => void;
	handleHoverCard: (data: HoverCardData) => void;
	hoverBackground: string;
};

function resolveOptionParams(
	option: ActionEffectGroupOption,
	pendingParams: PendingParams,
): Record<string, unknown> {
	const resolved: Record<string, unknown> = {};
	const params: OptionParams = option.params;
	if (!params) {
		return resolved;
	}
	for (const [key, value] of Object.entries(params)) {
		if (typeof value === 'string' && value.startsWith('$')) {
			if (!pendingParams) {
				continue;
			}
			const placeholder = value.slice(1);
			if (placeholder in pendingParams) {
				resolved[key] = pendingParams[placeholder];
			}
			continue;
		}
		resolved[key] = value;
	}
	if (
		resolved['id'] === undefined &&
		typeof resolved['developmentId'] === 'string'
	) {
		resolved['id'] = resolved['developmentId'];
	}
	return resolved;
}

function buildHoverDetails(
	option: ActionEffectGroupOption,
	mergedParams: Record<string, unknown>,
	translationContext: TranslationContext,
	hoverBackground: string,
	optionLabel: string,
	requirements: string[],
): HoverCardData {
	const hoverSummary = describeContent(
		'action',
		option.actionId,
		translationContext,
		mergedParams,
	);
	const { effects: baseEffects, description: baseDescription } =
		splitSummary(hoverSummary);
	let effects = baseEffects;
	let description = baseDescription;
	const target = resolveContentTarget(translationContext, mergedParams);
	const contentDetails = resolveContentDetails(translationContext, target);
	if (
		contentDetails?.describeEffects &&
		contentDetails.describeEffects.length > 0
	) {
		effects = contentDetails.describeEffects;
	}
	if (contentDetails?.description && contentDetails.description.length > 0) {
		description = contentDetails.description;
	}
	return {
		title: optionLabel.trim() || option.label || option.id,
		effects,
		...(description && { description }),
		requirements,
		bgClass: hoverBackground,
	};
}

export function useEffectGroupOptions({
	currentGroup,
	pendingParams,
	translationContext,
	formatRequirement,
	handleOptionSelect,
	clearHoverCard,
	handleHoverCard,
	hoverBackground,
}: EffectGroupOptionsParams): ActionCardOption[] | undefined {
	const [hovered, setHovered] = useState<{
		option: ActionEffectGroupOption;
		mergedParams: Record<string, unknown>;
		optionLabel: string;
	} | null>(null);
	const hoveredMetadata = useActionMetadata(
		hovered
			? {
					actionId: hovered.option.actionId,
					params: hovered.mergedParams as ActionParametersPayload,
				}
			: { actionId: null },
	);

	useEffect(() => {
		if (!hovered) {
			return;
		}
		const { option, mergedParams, optionLabel } = hovered;
		const requirementFailures = hoveredMetadata.requirements ?? [];
		const requirementStrings =
			requirementFailures.length > 0
				? requirementFailures.map((failure) =>
						formatRequirement(
							translateRequirementFailure(failure, translationContext),
						),
					)
				: hoveredMetadata.loading.requirements
					? ['Loading requirements…']
					: [];
		const hoverDetails = buildHoverDetails(
			option,
			mergedParams,
			translationContext,
			hoverBackground,
			optionLabel,
			requirementStrings,
		);
		handleHoverCard(hoverDetails);
	}, [
		hovered,
		hoveredMetadata.requirements,
		translationContext,
		formatRequirement,
		handleHoverCard,
		hoverBackground,
	]);

	useEffect(() => {
		if (!currentGroup) {
			setHovered(null);
			clearHoverCard();
		}
	}, [currentGroup, clearHoverCard]);

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
				translationContext,
				mergedParams,
			);
			const optionLabel = deriveActionOptionLabel(
				option,
				translationContext,
				summaryEntries,
			);
			const target = resolveContentTarget(translationContext, mergedParams);
			const contentDetails = resolveContentDetails(translationContext, target);
			const actionDescribeContent = describeContent(
				'action',
				option.actionId,
				translationContext,
				mergedParams,
			);
			const actionDescriptionSplit = splitSummary(actionDescribeContent);
			const actionDescriptionSummary = actionDescriptionSplit.description;
			const defaultSummaryText = extractPrimaryLine(summaryEntries);
			const defaultDescriptionText = extractParagraph(actionDescriptionSummary);
			const overrideSummary = extractPrimaryLine(contentDetails?.summary);
			const overrideDescription = extractParagraph(contentDetails?.description);
			const resolvedSummary = overrideSummary ?? defaultSummaryText;
			const resolvedDescription = overrideDescription ?? defaultDescriptionText;
			const card: ActionCardOption = {
				id: option.id,
				label: optionLabel,
				...(option.icon ? { icon: option.icon } : {}),
				onSelect: () => {
					clearHoverCard();
					const selectionParams =
						Object.keys(resolved).length > 0 ? resolved : undefined;
					handleOptionSelect(currentGroup, option, selectionParams);
				},
				compact: currentGroup.layout === 'compact',
			};
			if (option.summary) {
				card.summary = option.summary;
			} else if (resolvedSummary) {
				card.summary = resolvedSummary;
			}
			if (option.description) {
				card.description = option.description;
			} else if (resolvedDescription) {
				card.description = resolvedDescription;
			}
			card.onMouseEnter = () => {
				setHovered({
					option,
					mergedParams,
					optionLabel,
				});
			};
			card.onMouseLeave = () => {
				setHovered(null);
				clearHoverCard();
			};
			return card;
		});
	}, [
		clearHoverCard,
		currentGroup,
		translationContext,
		formatRequirement,
		handleHoverCard,
		handleOptionSelect,
		hoverBackground,
		pendingParams,
		setHovered,
	]);
}
