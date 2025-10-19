import React from 'react';
import type { ActionCategoryConfig } from '@kingdom-builder/protocol';
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
	category?: ActionCategoryConfig;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}

export default function HireOptions({
	action,
	category,
	player,
	canInteract,
	selectResourceDescriptor,
}: HireOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	const icon = category?.icon ?? action.icon ?? '👶';
	const title = category?.name ?? 'Hire';
	const subtitle = category?.description ?? HIRE_CATEGORY_DESCRIPTION;
	return (
		<div className="space-y-2">
			<ActionCategoryHeader icon={icon} title={title} subtitle={subtitle} />
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
			>
				<RaisePopOptions
					action={action}
					player={player}
					canInteract={canInteract}
					selectResourceDescriptor={selectResourceDescriptor}
				/>
			</div>
		</div>
	);
}
