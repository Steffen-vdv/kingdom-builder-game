import React, { useMemo } from 'react';
import {
	LAND_INFO,
	SLOT_INFO,
	DEVELOPMENTS_INFO,
} from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { describeContent, splitSummary } from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';

interface LandDisplayProps {
	player: EngineContext['activePlayer'];
}

const LandTile: React.FC<{
	land: EngineContext['activePlayer']['lands'][number];
	ctx: ReturnType<typeof useGameEngine>['ctx'];
	handleHoverCard: ReturnType<typeof useGameEngine>['handleHoverCard'];
	clearHoverCard: ReturnType<typeof useGameEngine>['clearHoverCard'];
	developAction?: { icon?: string; name: string } | undefined;
}> = ({ land, ctx, handleHoverCard, clearHoverCard, developAction }) => {
	const showLandCard = () => {
		const full = describeContent('land', land, ctx);
		const { effects, description } = splitSummary(full);
		handleHoverCard({
			title: `${LAND_INFO.icon} ${LAND_INFO.label}`,
			effects,
			requirements: [],
			effectsTitle: DEVELOPMENTS_INFO.label,
			...(description && { description }),
			bgClass:
				'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
		});
	};
	const animateSlots = useAnimate<HTMLDivElement>();
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
				{Array.from({ length: land.slotsMax }).map((_, i) => {
					const devId = land.developments[i];
					if (devId) {
						const name = ctx.developments.get(devId)?.name || devId;
						const title = `${ctx.developments.get(devId)?.icon || ''} ${name}`;
						const handleLeave = () => showLandCard();
						return (
							<span
								key={i}
								className="land-slot"
								aria-label={name}
								onMouseEnter={(e) => {
									e.stopPropagation();
									const full = describeContent('development', devId, ctx, {
										installed: true,
									});
									const { effects, description } = splitSummary(full);
									handleHoverCard({
										title,
										effects,
										requirements: [],
										...(description && { description }),
										bgClass:
											'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
									});
								}}
								onMouseLeave={(e) => {
									e.stopPropagation();
									handleLeave();
								}}
							>
								<span aria-hidden="true">
									{ctx.developments.get(devId)?.icon}
								</span>
							</span>
						);
					}
					const handleLeave = () => showLandCard();
					return (
						<span
							key={i}
							className="land-slot italic"
							aria-label={`${SLOT_INFO.label} (empty)`}
							onMouseEnter={(e) => {
								e.stopPropagation();
								handleHoverCard({
									title: `${SLOT_INFO.icon} ${SLOT_INFO.label} (empty)`,
									effects: [],
									...(developAction && {
										description: `Use ${developAction.icon || ''} ${developAction.name} to build here`,
									}),
									requirements: [],
									bgClass:
										'bg-gradient-to-br from-white/80 to-white/60 dark:from-slate-900/80 dark:to-slate-900/60',
								});
							}}
							onMouseLeave={(e) => {
								e.stopPropagation();
								handleLeave();
							}}
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
	const { ctx, handleHoverCard, clearHoverCard } = useGameEngine();
	const developAction = useMemo(() => {
		const entry = Array.from(
			(
				ctx.actions as unknown as {
					map: Map<string, { category?: string; icon?: string; name: string }>;
				}
			).map.entries(),
		).find(([, a]) => a.category === 'development');
		if (!entry) return undefined;
		const [, info] = entry;
		return info.icon
			? { icon: info.icon, name: info.name }
			: { name: info.name };
	}, [ctx]);
	if (player.lands.length === 0) return null;
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
					ctx={ctx}
					handleHoverCard={handleHoverCard}
					clearHoverCard={clearHoverCard}
					developAction={developAction}
				/>
			))}
		</div>
	);
};

export default LandDisplay;
