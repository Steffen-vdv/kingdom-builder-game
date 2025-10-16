import { useEffect, useMemo, useState } from 'react';
import type {
	ActionEffectGroup,
	ActionEffectGroupOption,
} from '@kingdom-builder/protocol';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	translateRequirementFailure,
	type Summary,
	type TranslationContext,
} from '../../translation';
import { type ActionCardOption } from './ActionCard';
import type { HoverCardData } from './types';
import { deriveActionOptionLabel } from '../../translation/effects/optionLabel';
import { useActionMetadata } from '../../state/useActionMetadata';

type OptionParams = ActionEffectGroupOption['params'];
type PendingParams = Record<string, unknown> | undefined;

type BuildOptionsParams = {
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

interface ActiveOptionState {
	option: ActionEffectGroupOption;
	mergedParams: Record<string, unknown>;
	optionLabel: string;
	baseEffects: Summary;
	description?: Summary;
}

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

export function useEffectGroupOptions({
	currentGroup,
	pendingParams,
	translationContext,
	formatRequirement,
	handleOptionSelect,
	clearHoverCard,
	handleHoverCard,
	hoverBackground,
}: BuildOptionsParams): ActionCardOption[] | undefined {
	const [activeOption, setActiveOption] = useState<ActiveOptionState | null>(
		null,
	);
	const activeMetadata = useActionMetadata(
		activeOption
			? {
					actionId: activeOption.option.actionId,
					params: activeOption.mergedParams,
				}
			: { actionId: '', enabled: false },
	);

	useEffect(() => {
		if (!activeOption) {
			return;
		}
		const failures = activeMetadata.requirements;
		if (!failures) {
			return;
		}
		const requirementTexts = failures.map((failure) =>
			formatRequirement(
				translateRequirementFailure(failure, translationContext),
			),
		);
		let effects = activeOption.baseEffects;
		let description = activeOption.description;
		const idParam = activeOption.mergedParams?.['id'];
		const developmentParam = activeOption.mergedParams?.['developmentId'];
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
				const { effects: developmentEffects } =
					splitSummary(developmentSummary);
				if (developmentEffects.length > 0) {
					effects = developmentEffects;
				}
			} catch {
				/* ignore missing development summaries */
			}
		}
		const hoverDetails: HoverCardData = {
			title:
				activeOption.optionLabel.trim() ||
				activeOption.option.label ||
				activeOption.option.id,
			effects,
			...(description && { description }),
			requirements: requirementTexts,
			bgClass: hoverBackground,
		};
		handleHoverCard(hoverDetails);
	}, [
		activeMetadata.requirements,
		activeOption,
		formatRequirement,
		handleHoverCard,
		hoverBackground,
		translationContext,
	]);

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
					setActiveOption(null);
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
				const hoverSummary = describeContent(
					'action',
					option.actionId,
					translationContext,
					mergedParams,
				);
				const { effects: baseEffects, description } =
					splitSummary(hoverSummary);
				const nextActiveOption: ActiveOptionState = {
					option,
					mergedParams,
					optionLabel,
					baseEffects,
					...(description ? { description } : {}),
				};
				setActiveOption(nextActiveOption);
				handleHoverCard({
					title: optionLabel.trim() || option.label || option.id,
					effects: baseEffects,
					...(description && { description }),
					requirements: ['Loading requirements…'],
					bgClass: hoverBackground,
				});
			};
			card.onMouseLeave = () => {
				setActiveOption((previous) =>
					previous?.option.id === option.id ? null : previous,
				);
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
		setActiveOption,
		pendingParams,
	]);
}
