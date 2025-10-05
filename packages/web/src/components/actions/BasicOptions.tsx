import React from 'react';
import { type Summary } from '../../translation';
import { useAnimate } from '../../utils/useAutoAnimate';
import ActionCategoryHeader from './ActionCategoryHeader';
import GenericActions from './GenericActions';
import type { Action, DisplayPlayer } from './types';

const BASIC_CATEGORY_ICON = '⚙️';
const BASIC_CATEGORY_DESCRIPTION =
	'(Effects take place immediately, unless stated otherwise)';

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
		<div className="space-y-2">
			<ActionCategoryHeader
				icon={BASIC_CATEGORY_ICON}
				title="Basic"
				subtitle={BASIC_CATEGORY_DESCRIPTION}
			/>
			<div
				ref={listRef}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"
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
