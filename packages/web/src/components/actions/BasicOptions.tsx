import React from 'react';
import { type Summary } from '../../translation';
import { useAnimate } from '../../utils/useAutoAnimate';
import GenericActions from './GenericActions';
import type { Action, DisplayPlayer } from './types';
import type { ResourceDescriptorSelector } from './utils';

interface BasicOptionsProps {
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}

export default function BasicOptions({
	actions,
	summaries,
	player,
	canInteract,
	selectResourceDescriptor,
}: BasicOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	return (
		<div
			ref={listRef}
			className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
		>
			<GenericActions
				actions={actions}
				summaries={summaries}
				player={player}
				canInteract={canInteract}
				selectResourceDescriptor={selectResourceDescriptor}
			/>
		</div>
	);
}
