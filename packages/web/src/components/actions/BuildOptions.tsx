import React, { useMemo } from 'react';
import {
	splitSummary,
	translateRequirementFailure,
	type Summary,
} from '../../translation';
import { useGameEngine } from '../../state/GameContext';
import { useAnimate } from '../../utils/useAutoAnimate';
import { getRequirementIcons } from '../../utils/getRequirementIcons';
import ActionCard from './ActionCard';
import {
	formatMissingResources,
	playerHasRequiredResources,
	sumNonActionCosts,
} from './utils';
import {
	toPerformableAction,
	type Action,
	type Building,
	type DisplayPlayer,
} from './types';

const HOVER_CARD_BG = [
	'bg-gradient-to-br from-white/80 to-white/60',
	'dark:from-slate-900/80 dark:to-slate-900/60',
].join(' ');

interface BuildOptionsProps {
	action: Action;
	isActionPhase: boolean;
	buildings: Building[];
	summaries: Map<string, Summary>;
	descriptions: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
}

export default function BuildOptions({
	action,
	isActionPhase,
	buildings,
	summaries,
	descriptions,
	player,
	canInteract,
}: BuildOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	const {
		session,
		sessionView,
		translationContext,
		handlePerform,
		handleHoverCard,
		clearHoverCard,
		actionCostResource,
	} = useGameEngine();
	const requirementIcons = useMemo(
		() => getRequirementIcons(action.id, translationContext),
		[action.id, translationContext],
	);
	const actionInfo = sessionView.actions.get(action.id);
	const requirementFailures = useMemo(
		() => session.getActionRequirements(action.id),
		[session, action.id],
	);
	const requirements = useMemo(
		() =>
			requirementFailures.map((failure) =>
				translateRequirementFailure(failure, translationContext),
			),
		[requirementFailures, translationContext],
	);
	const meetsRequirements = requirements.length === 0;
	const entries = useMemo(() => {
		const owned = player.buildings;
		return buildings
			.filter((building) => !owned.has(building.id))
			.map((building) => {
				const costsBag = session.getActionCosts(action.id, {
					id: building.id,
				});
				const costs: Record<string, number> = {};
				for (const [costKey, costAmount] of Object.entries(costsBag)) {
					costs[costKey] = costAmount ?? 0;
				}
				const total = sumNonActionCosts(costs, actionCostResource);
				return { building, costs, total };
			})
			.sort((first, second) => first.total - second.total);
	}, [
		buildings,
		session,
		action.id,
		actionCostResource,
		player.buildings.size,
	]);
	return (
		<div>
			<h3 className="font-medium">
				{actionInfo?.icon || ''} {actionInfo?.name || action.name}{' '}
				<span className="italic text-sm font-normal">
					(Effects take place on build and last until building is removed)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				{entries.map(({ building, costs }) => {
					const upkeep = building.upkeep;
					const focus = building.focus;
					const icon = building.icon;
					const canPay = playerHasRequiredResources(player.resources, costs);
					const summary = summaries.get(building.id);
					const implemented = (summary?.length ?? 0) > 0;
					const insufficientTooltip = formatMissingResources(
						costs,
						player.resources,
					);
					const requirementText = requirements.join(', ');
					const title = !implemented
						? 'Not implemented yet'
						: !meetsRequirements
							? requirementText
							: !canPay
								? (insufficientTooltip ?? 'Cannot pay costs')
								: undefined;
					const enabled =
						canPay &&
						meetsRequirements &&
						isActionPhase &&
						canInteract &&
						implemented;
					return (
						<ActionCard
							key={building.id}
							title={
								<>
									{icon || ''} {building.name}
								</>
							}
							costs={costs}
							upkeep={upkeep}
							playerResources={player.resources}
							actionCostResource={actionCostResource}
							requirements={requirements}
							requirementIcons={requirementIcons}
							summary={summary}
							implemented={implemented}
							enabled={enabled}
							tooltip={title}
							focus={focus}
							onClick={() => {
								if (!canInteract) {
									return;
								}
								void handlePerform(toPerformableAction(action), {
									id: building.id,
								});
							}}
							onMouseEnter={() => {
								const full = descriptions.get(building.id) ?? [];
								const { effects, description } = splitSummary(full);
								handleHoverCard({
									title: `${actionInfo?.icon || ''} ${
										actionInfo?.name ?? action.name
									} - ${icon || ''} ${building.name}`,
									effects,
									requirements,
									costs,
									upkeep,
									...(description && { description }),
									...(!implemented && {
										description: 'Not implemented yet',
										descriptionClass: 'italic text-red-600',
									}),
									bgClass: HOVER_CARD_BG,
								});
							}}
							onMouseLeave={clearHoverCard}
						/>
					);
				})}
			</div>
		</div>
	);
}
