import React from 'react';
import { type Summary } from '../../translation';
import { useAnimate } from '../../utils/useAutoAnimate';
import GenericActions from './GenericActions';
import type { Action, DisplayPlayer } from './types';

interface BasicOptionsProps {
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
}

export default function BasicOptions({
	actions,
	summaries,
	player,
	canInteract,
}: BasicOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	return (
		<div>
			<h3 className="font-medium">
				Basic{' '}
				<span className="italic text-sm font-normal">
					(Effects take place immediately, unless stated otherwise)
				</span>
			</h3>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-1"
			>
				<GenericActions
					actions={actions}
					summaries={summaries}
					player={player}
					canInteract={canInteract}
				/>
			</div>
		</div>
	);
}
