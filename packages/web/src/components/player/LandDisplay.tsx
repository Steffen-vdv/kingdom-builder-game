import React, { useCallback, useMemo } from 'react';
import type {
	ActionEffect,
	SessionPlayerStateSnapshot,
} from '@kingdom-builder/protocol';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import {
	useDevelopmentMetadata,
	useLandMetadata,
	useSlotMetadata,
} from '../../contexts/RegistryMetadataContext';
import type { TranslationActionCategoryDefinition } from '../../translation/context/types';
import {
	formatIconLabel,
	toDescriptorDisplay,
	type DescriptorDisplay,
} from './registryDisplays';

interface CategorizedAction {
	category?: string;
	categoryId?: string;
	icon?: string;
	name: string;
}

type ActionWithEffects = CategorizedAction & {
	effects?: ReadonlyArray<ActionEffect>;
};

const normalizeCategoryKey = (value: string | undefined): string => {
	if (typeof value !== 'string') {
		return '';
	}
	const trimmed = value.trim().toLowerCase();
	return trimmed;
};

const resolveActionCategoryId = (
	action: CategorizedAction,
	categoryKeyMap: ReadonlyMap<string, string>,
): string | undefined => {
	const rawCategory = action.categoryId ?? action.category;
	if (typeof rawCategory !== 'string') {
		return undefined;
	}
	const normalized = normalizeCategoryKey(rawCategory);
	if (!normalized) {
		return undefined;
	}
	const resolved = categoryKeyMap.get(normalized);
	if (resolved) {
		return resolved;
	}
	return rawCategory;
};

const buildCategoryKeyMap = (
	definitions: readonly TranslationActionCategoryDefinition[],
): ReadonlyMap<string, string> => {
	const entries = new Map<string, string>();
	definitions.forEach((definition) => {
		const primaryKey = normalizeCategoryKey(
			definition.analyticsKey ?? definition.id,
		);
		if (primaryKey) {
			entries.set(primaryKey, definition.id);
		}
		const idKey = normalizeCategoryKey(definition.id);
		if (idKey) {
			entries.set(idKey, definition.id);
		}
		if (primaryKey === 'develop' && !entries.has('development')) {
			entries.set('development', definition.id);
		}
	});
	return entries;
};

const hasDevelopmentEffect = (
	effects: ReadonlyArray<ActionEffect> | undefined,
): boolean => {
	if (!effects) {
		return false;
	}
	for (const effect of effects) {
		if (!effect || typeof effect !== 'object') {
			continue;
		}
		if ('options' in effect) {
			continue;
		}
		if (effect.type === 'development') {
			return true;
		}
		if (hasDevelopmentEffect(effect.effects)) {
			return true;
		}
	}
	return false;
};

interface LandDisplayProps {
	player: SessionPlayerStateSnapshot;
}

const HOVER_CARD_BACKGROUND =
	'bg-gradient-to-br from-white/80 to-white/60 ' +
	'dark:from-slate-900/80 dark:to-slate-900/60';

const LandTile: React.FC<{
	land: SessionPlayerStateSnapshot['lands'][number];
	translationContext: ReturnType<typeof useGameEngine>['translationContext'];
	handleHoverCard: ReturnType<typeof useGameEngine>['handleHoverCard'];
	clearHoverCard: ReturnType<typeof useGameEngine>['clearHoverCard'];
	developAction?: { icon?: string; name: string } | undefined;
	landDisplay: DescriptorDisplay;
	slotDisplay: DescriptorDisplay;
	getDevelopmentDisplay: (developmentId: string) => DescriptorDisplay;
}> = ({
	land,
	translationContext,
	handleHoverCard,
	clearHoverCard,
	developAction,
	landDisplay,
	slotDisplay,
	getDevelopmentDisplay,
}) => {
	const showLandCard = () => {
		const full = describeContent('land', land, translationContext);
		const { effects, description } = splitSummary(full);
		handleHoverCard({
			title: formatIconLabel(landDisplay),
			effects,
			requirements: [],
			effectsTitle: DEVELOPMENTS_TITLE,
			...(description && { description }),
			...(landDisplay.description
				? { description: landDisplay.description }
				: {}),
			bgClass: HOVER_CARD_BACKGROUND,
		});
	};
	const animateSlots = useAnimate<HTMLDivElement>();
	const slotIndices = useMemo(
		() => Array.from({ length: land.slotsMax }, (_, index) => index),
		[land.slotsMax],
	);
	return (
		<div
			className="panel-card hoverable land-tile"
			onMouseEnter={showLandCard}
			onMouseLeave={clearHoverCard}
		>
			<span className="font-medium">
				{landDisplay.icon && <span aria-hidden="true">{landDisplay.icon}</span>}{' '}
				{landDisplay.label}
			</span>
			<div
				ref={animateSlots}
				className="mt-1 flex flex-wrap justify-center gap-1"
			>
				{slotIndices.map((slotIndex) => {
					const devId = land.developments[slotIndex];
					if (devId) {
						const developmentDisplay = getDevelopmentDisplay(devId);
						const title = formatIconLabel(developmentDisplay);
						const handleLeave = () => showLandCard();
						const handleMouseEnter = (
							event: React.MouseEvent<HTMLSpanElement>,
						) => {
							event.stopPropagation();
							const full = describeContent(
								'development',
								devId,
								translationContext,
								{
									installed: true,
								},
							);
							const { effects, description } = splitSummary(full);
							handleHoverCard({
								title,
								effects,
								requirements: [],
								...(description && { description }),
								bgClass: HOVER_CARD_BACKGROUND,
							});
						};
						const handleMouseLeave = (
							event: React.MouseEvent<HTMLSpanElement>,
						) => {
							event.stopPropagation();
							handleLeave();
						};
						return (
							<span
								key={slotIndex}
								className="panel-card hoverable land-slot"
								aria-label={developmentDisplay.label}
								onMouseEnter={handleMouseEnter}
								onMouseLeave={handleMouseLeave}
							>
								<span aria-hidden="true">{developmentDisplay.icon}</span>
							</span>
						);
					}
					const handleLeave = () => showLandCard();
					const handleMouseEnter = (
						event: React.MouseEvent<HTMLSpanElement>,
					) => {
						event.stopPropagation();
						const description =
							slotDisplay.description ??
							(developAction
								? `Use ${
										developAction.icon ? `${developAction.icon} ` : ''
									}${developAction.name} to build here`
								: undefined);
						handleHoverCard({
							title: `${formatIconLabel(slotDisplay)} (empty)`,
							effects: [],
							...(description ? { description } : {}),
							requirements: [],
							bgClass: HOVER_CARD_BACKGROUND,
						});
					};
					const handleMouseLeave = (
						event: React.MouseEvent<HTMLSpanElement>,
					) => {
						event.stopPropagation();
						handleLeave();
					};
					return (
						<span
							key={slotIndex}
							className="panel-card hoverable land-slot italic"
							aria-label={`${slotDisplay.label} (empty)`}
							onMouseEnter={handleMouseEnter}
							onMouseLeave={handleMouseLeave}
						>
							<span aria-hidden="true">{slotDisplay.icon}</span>
						</span>
					);
				})}
			</div>
		</div>
	);
};

const LandDisplay: React.FC<LandDisplayProps> = ({ player }) => {
	const { translationContext, handleHoverCard, clearHoverCard } =
		useGameEngine();
	const landMetadata = useLandMetadata();
	const slotMetadata = useSlotMetadata();
	const developmentMetadata = useDevelopmentMetadata();
	const categoryDefinitions = useMemo(
		() => translationContext.actionCategories.list(),
		[translationContext.actionCategories],
	);
	const categoryKeyMap = useMemo(
		() => buildCategoryKeyMap(categoryDefinitions),
		[categoryDefinitions],
	);
	const developAction = useMemo(() => {
		for (const definition of categoryDefinitions) {
			for (const actionId of player.actions) {
				if (!translationContext.actions.has(actionId)) {
					continue;
				}
				const action = translationContext.actions.get(
					actionId,
				) as ActionWithEffects;
				const resolvedCategoryId = resolveActionCategoryId(
					action,
					categoryKeyMap,
				);
				if (resolvedCategoryId !== definition.id) {
					continue;
				}
				if (!hasDevelopmentEffect(action.effects)) {
					continue;
				}
				const icon = action.icon;
				return icon ? { icon, name: action.name } : { name: action.name };
			}
		}
		return undefined;
	}, [
		categoryDefinitions,
		player.actions,
		translationContext.actions,
		categoryKeyMap,
	]);
	const landDisplay = useMemo(
		() => toDescriptorDisplay(landMetadata.select()),
		[landMetadata],
	);
	const slotDisplay = useMemo(
		() => toDescriptorDisplay(slotMetadata.select()),
		[slotMetadata],
	);
	const getDevelopmentDisplay = useCallback(
		(developmentId: string) => {
			const descriptor = toDescriptorDisplay(
				developmentMetadata.select(developmentId),
			);
			if (!translationContext.developments.has(developmentId)) {
				return descriptor;
			}
			const definition = translationContext.developments.get(developmentId);
			const label = definition?.name ?? descriptor.label;
			const iconOverride = (definition as { icon?: string } | undefined)?.icon;
			const entry: DescriptorDisplay = {
				...descriptor,
				label,
			};
			if (iconOverride !== undefined) {
				entry.icon = iconOverride;
			}
			return entry;
		},
		[developmentMetadata, translationContext.developments],
	);
	if (player.lands.length === 0) {
		return null;
	}
	const animateLands = useAnimate<HTMLDivElement>();
	return (
		<div
			ref={animateLands}
			className="mt-3 grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
		>
			{player.lands.map((land) => (
				<LandTile
					key={land.id}
					land={land}
					translationContext={translationContext}
					handleHoverCard={handleHoverCard}
					clearHoverCard={clearHoverCard}
					developAction={developAction}
					landDisplay={landDisplay}
					slotDisplay={slotDisplay}
					getDevelopmentDisplay={getDevelopmentDisplay}
				/>
			))}
		</div>
	);
};

const DEVELOPMENTS_TITLE = 'Developments';

export default LandDisplay;
