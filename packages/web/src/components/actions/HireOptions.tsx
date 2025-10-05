import React from 'react';
import { useAnimate } from '../../utils/useAutoAnimate';
import type { Action, DisplayPlayer } from './types';
import RaisePopOptions from './RaisePopOptions';

interface HireOptionsProps {
	action: Action;
	player: DisplayPlayer;
	canInteract: boolean;
}

export default function HireOptions({
	action,
	player,
	canInteract,
}: HireOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	return (
		<div>
			<h3 className="font-medium">
				Hire{' '}
				<span className="italic text-sm font-normal">
					(Recruit population instantly; upkeep and role effects apply while
					they remain)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				<RaisePopOptions
					action={action}
					player={player}
					canInteract={canInteract}
				/>
			</div>
		</div>
	);
}
