import { useMemo } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	translateRequirementFailure,
	type TranslationContext,
} from '../../translation';
import { type ActionCardOption } from './ActionCard';
import type { HoverCardData, GameEngineApi } from './types';
import { deriveActionOptionLabel } from '../../translation/effects/optionLabel';

type OptionParams = ActionEffectGroupOption['params'];
type PendingParams = Record<string, unknown> | undefined;

type BuildOptionsParams = {
	currentGroup: ActionEffectGroup | undefined;
	pendingParams: PendingParams;
	session: GameEngineApi['session'];
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
	session: GameEngineApi['session'],
	translationContext: TranslationContext,
	formatRequirement: (requirement: string) => string,
	hoverBackground: string,
	optionLabel: string,
): HoverCardData {
	const hoverSummary = describeContent(
		'action',
		option.actionId,
		translationContext,
		mergedParams,
	);
	const { effects: baseEffects, description } = splitSummary(hoverSummary);
	const requirementFailures = session.getActionRequirements(
		option.actionId,
		mergedParams,
	);
	const requirements = requirementFailures.map((failure) =>
		formatRequirement(translateRequirementFailure(failure, translationContext)),
	);
	let effects = baseEffects;
	const idParam = mergedParams?.id;
	const developmentParam = mergedParams?.developmentId;
	const developmentId =
		typeof idParam === 'string'
			? idParam
			: typeof developmentParam === 'string'
				? developmentParam
				: undefined;
	if (typeof developmentId === 'string') {
		try {
			const developmentSummary = describeContent(
				'development',
				developmentId,
				translationContext,
			);
			const { effects: developmentEffects } = splitSummary(developmentSummary);
			if (developmentEffects.length > 0) {
				effects = developmentEffects;
			}
		} catch {
			/* ignore missing development summaries */
		}
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
	session,
	translationContext,
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
				translationContext,
				mergedParams,
			);
			const optionLabel = deriveActionOptionLabel(
				option,
				translationContext,
				summaryEntries,
			);
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
			}
			if (option.description) {
				card.description = option.description;
			}
			card.onMouseEnter = () => {
				const hoverDetails = buildHoverDetails(
					option,
					mergedParams,
					session,
					translationContext,
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
		currentGroup,
		session,
		translationContext,
		formatRequirement,
		handleHoverCard,
		handleOptionSelect,
		hoverBackground,
		pendingParams,
	]);
}
