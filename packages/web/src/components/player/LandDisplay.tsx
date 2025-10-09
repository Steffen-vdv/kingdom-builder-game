import React, { useMemo } from 'react';
import {
	LAND_INFO,
	SLOT_INFO,
	DEVELOPMENTS_INFO,
} from '@kingdom-builder/contents';
import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';

interface LandDisplayProps {
	player: PlayerStateSnapshot;
}

const HOVER_CARD_BACKGROUND =
	'bg-gradient-to-br from-white/80 to-white/60 ' +
	'dark:from-slate-900/80 dark:to-slate-900/60';

const LandTile: React.FC<{
	land: PlayerStateSnapshot['lands'][number];
	translationContext: ReturnType<typeof useGameEngine>['translationContext'];
	handleHoverCard: ReturnType<typeof useGameEngine>['handleHoverCard'];
	clearHoverCard: ReturnType<typeof useGameEngine>['clearHoverCard'];
	developAction?: { icon?: string; name: string } | undefined;
}> = ({
	land,
	translationContext,
	handleHoverCard,
	clearHoverCard,
	developAction,
}) => {
	const showLandCard = () => {
		const full = describeContent('land', land, translationContext);
		const { effects, description } = splitSummary(full);
		handleHoverCard({
			title: `${LAND_INFO.icon} ${LAND_INFO.label}`,
			effects,
			requirements: [],
			effectsTitle: DEVELOPMENTS_INFO.label,
			...(description && { description }),
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
			className="land-tile"
			onMouseEnter={showLandCard}
			onMouseLeave={clearHoverCard}
		>
			<span className="font-medium">
				{LAND_INFO.icon} {LAND_INFO.label}
			</span>
			<div
				ref={animateSlots}
				className="mt-1 flex flex-wrap justify-center gap-1"
			>
				{slotIndices.map((slotIndex) => {
					const devId = land.developments[slotIndex];
					if (devId) {
						const hasDefinition = translationContext.developments.has(devId);
						const development = hasDefinition
							? translationContext.developments.get(devId)
							: undefined;
						const name = development?.name || devId;
						const title = `${development?.icon || ''} ${name}`;
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
								className="land-slot"
								aria-label={name}
								onMouseEnter={handleMouseEnter}
								onMouseLeave={handleMouseLeave}
							>
								<span aria-hidden="true">{development?.icon}</span>
							</span>
						);
					}
					const handleLeave = () => showLandCard();
					const handleMouseEnter = (
						event: React.MouseEvent<HTMLSpanElement>,
					) => {
						event.stopPropagation();
						handleHoverCard({
							title: `${SLOT_INFO.icon} ${SLOT_INFO.label} (empty)`,
							effects: [],
							...(developAction && {
								description: `Use ${developAction.icon || ''} ${developAction.name} to build here`,
							}),
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
							className="land-slot italic"
							aria-label={`${SLOT_INFO.label} (empty)`}
							onMouseEnter={handleMouseEnter}
							onMouseLeave={handleMouseLeave}
						>
							<span aria-hidden="true">{SLOT_INFO.icon}</span>
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
	const developAction = useMemo(() => {
		for (const actionId of player.actions) {
			if (!translationContext.actions.has(actionId)) {
				continue;
			}
			const action = translationContext.actions.get(actionId);
			const category = (action as { category?: string }).category;
			if (category === 'development') {
				const icon = (action as { icon?: string }).icon;
				return icon ? { icon, name: action.name } : { name: action.name };
			}
		}
		return undefined;
	}, [player.actions, translationContext]);
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
				/>
			))}
		</div>
	);
};

export default LandDisplay;
