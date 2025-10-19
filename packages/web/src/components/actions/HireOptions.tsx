import React from 'react';
import { useAnimate } from '../../utils/useAutoAnimate';
import ActionCategoryHeader from './ActionCategoryHeader';
import type { Action, DisplayPlayer } from './types';
import RaisePopOptions from './RaisePopOptions';
import type { ResourceDescriptorSelector } from './utils';

const HIRE_CATEGORY_DESCRIPTION =
	'(Recruit population instantly; upkeep and role effects apply while ' +
	'they remain)';

interface HireOptionsProps {
	action: Action;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	defaultActionCost: number;
}

export default function HireOptions({
	action,
	player,
	canInteract,
	selectResourceDescriptor,
	defaultActionCost,
}: HireOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	const icon = action.icon ?? '👶';
	return (
		<div className="space-y-2">
			<ActionCategoryHeader
				icon={icon}
				title="Hire"
				subtitle={HIRE_CATEGORY_DESCRIPTION}
			/>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
			>
				<RaisePopOptions
					action={action}
					player={player}
					canInteract={canInteract}
					selectResourceDescriptor={selectResourceDescriptor}
					defaultActionCost={defaultActionCost}
				/>
			</div>
		</div>
	);
}
