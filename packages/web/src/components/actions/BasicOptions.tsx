import React from 'react';
import type { ActionCategoryConfig } from '@kingdom-builder/protocol';
import { type Summary } from '../../translation';
import { useAnimate } from '../../utils/useAutoAnimate';
import ActionCategoryHeader from './ActionCategoryHeader';
import GenericActions from './GenericActions';
import type { Action, DisplayPlayer } from './types';
import type { ResourceDescriptorSelector } from './utils';

interface BasicOptionsProps {
	category: ActionCategoryConfig;
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}

export default function BasicOptions({
	category,
	actions,
	summaries,
	player,
	canInteract,
	selectResourceDescriptor,
}: BasicOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	const icon = category.icon ?? '⚙️';
	const title = category.name ?? 'Basic';
	const subtitle =
		category.description ??
		'(Effects take place immediately, unless stated otherwise)';
	return (
		<div className="space-y-2">
			<ActionCategoryHeader icon={icon} title={title} subtitle={subtitle} />
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
		</div>
	);
}
