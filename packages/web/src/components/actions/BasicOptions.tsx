import React from 'react';
import { type Summary } from '../../translation';
import { useAnimate } from '../../utils/useAutoAnimate';
import type { ActionCategoryDescriptor } from './ActionCategoryHeader';
import GenericActions from './GenericActions';
import type { Action, DisplayPlayer } from './types';
import type { ResourceDescriptorSelector } from './utils';
import { CATEGORY_SUBTITLE_CLASSES } from './actionsPanelStyles';

interface BasicOptionsProps {
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	category: ActionCategoryDescriptor;
}

export default function BasicOptions({
	actions,
	summaries,
	player,
	canInteract,
	selectResourceDescriptor,
	category,
}: BasicOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	const { subtitle } = category;
	return (
		<div className="space-y-3">
			{subtitle ? (
				<p className={CATEGORY_SUBTITLE_CLASSES}>{subtitle}</p>
			) : null}
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
