import React from 'react';
import { type Summary } from '../../translation';
import { useAnimate } from '../../utils/useAutoAnimate';
import ActionCategoryHeader, {
	type ActionCategoryDescriptor,
} from './ActionCategoryHeader';
import GenericActions from './GenericActions';
import type { Action, DisplayPlayer } from './types';
import type { UseActionMetadataResult } from '../../state/useActionMetadata';
import type { ResourceDescriptorSelector } from './utils';

interface BasicOptionsProps {
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	category: ActionCategoryDescriptor;
	metadataByAction: Map<string, UseActionMetadataResult>;
}

export default function BasicOptions({
	actions,
	summaries,
	player,
	canInteract,
	selectResourceDescriptor,
	category,
	metadataByAction,
}: BasicOptionsProps) {
	const listRef = useAnimate<HTMLDivElement>();
	return (
		<div className="space-y-3">
			<ActionCategoryHeader descriptor={category} />
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
					metadataByAction={metadataByAction}
				/>
			</div>
		</div>
	);
}
