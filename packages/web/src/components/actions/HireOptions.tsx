import React from 'react';
import { useAnimate } from '../../utils/useAutoAnimate';
import ActionCategoryHeader, {
	type ActionCategoryDescriptor,
} from './ActionCategoryHeader';
import type { Action, DisplayPlayer } from './types';
import RaisePopOptions from './RaisePopOptions';
import type { ResourceDescriptorSelector } from './utils';

interface HireOptionsProps {
	action: Action;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	category: ActionCategoryDescriptor;
}

export default function HireOptions({
	action,
	player,
	canInteract,
	selectResourceDescriptor,
	category,
}: HireOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	return (
		<div className="space-y-3">
			<ActionCategoryHeader descriptor={category} />
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
