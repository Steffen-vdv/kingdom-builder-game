import React from 'react';
import type { Summary } from '../../translation';
import BasicOptions from './BasicOptions';
import type { Action, DisplayPlayer } from './types';
import type { ResourceDescriptorSelector } from './utils';
import {
	POOL_SLOT_CLASSES,
	POOL_SLOT_EMPTY_CLASSES,
} from './actionsPanelStyles';

interface PoolSlotsProps {
	actions: Action[];
	poolSize: number;
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
}

/**
 * Renders the grid of pool slots for a meta-category pool, filling any unused
 * capacity with placeholder "Empty" tiles. Shared by MetaCategoryPanel and
 * ResearchProgressionPanel.
 */
export default function PoolSlots({
	actions,
	poolSize,
	summaries,
	player,
	canInteract,
	selectResourceDescriptor,
}: PoolSlotsProps) {
	const emptySlots = Math.max(0, poolSize - actions.length);
	return (
		<div className="grid grid-cols-3 gap-2 mt-4">
			{actions.map((action) => (
				<div key={action.id} className={POOL_SLOT_CLASSES}>
					<BasicOptions
						actions={[action]}
						summaries={summaries}
						player={player}
						canInteract={canInteract}
						selectResourceDescriptor={selectResourceDescriptor}
					/>
				</div>
			))}
			{Array.from({ length: emptySlots }).map((_, index) => (
				<div
					key={`empty-${index}`}
					className={POOL_SLOT_EMPTY_CLASSES}
					aria-label="Empty pool slot"
				>
					<span className="text-gray-400">Empty</span>
				</div>
			))}
		</div>
	);
}
