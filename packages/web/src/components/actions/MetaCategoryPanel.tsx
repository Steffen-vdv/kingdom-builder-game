import React, { useMemo } from 'react';
import type { ActionMetaCategoryConfig } from '@kingdom-builder/protocol';
import type { Summary } from '../../translation';
import { useResourceMetadata } from '../../contexts/RegistryMetadataContext';
import BasicOptions from './BasicOptions';
import PoolSlots from './PoolSlots';
import type { Action, DisplayPlayer } from './types';
import type { ResourceDescriptorSelector } from './utils';
import {
	COST_LABEL_CLASSES,
	HEADER_CLASSES,
	SECTION_CLASSES,
	TITLE_CLASSES,
	POOL_STATUS_CLASSES,
} from './actionsPanelStyles';

interface MetaCategoryPanelProps {
	metaCategory: ActionMetaCategoryConfig;
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	panelDisabled: boolean;
}

/**
 * Renders a single meta-category panel with appropriate display mode.
 * - Pool mode: Fixed slots showing available actions from pool
 * - List mode: Full category tabs with all available actions
 */
export default function MetaCategoryPanel({
	metaCategory,
	actions,
	summaries,
	player,
	canInteract,
	selectResourceDescriptor,
	panelDisabled,
}: MetaCategoryPanelProps) {
	const resourceMetadata = useResourceMetadata();

	// Get binding resource display info
	const bindingDescriptor = useMemo(
		() =>
			resourceMetadata.byId[metaCategory.bindingResourceId] ??
			resourceMetadata.select(metaCategory.bindingResourceId),
		[resourceMetadata, metaCategory.bindingResourceId],
	);

	const bindingIcon = bindingDescriptor.icon;
	const bindingLabel =
		bindingDescriptor.label ?? metaCategory.bindingResourceId;

	// Check visibility based on trigger
	const isVisible = useMemo(() => {
		if (metaCategory.visibilityTrigger === 'always') {
			return true;
		}
		// 'resource-touched' - show only if binding resource has been touched
		return player.resourceTouched[metaCategory.bindingResourceId] ?? false;
	}, [metaCategory.visibilityTrigger, metaCategory.bindingResourceId, player]);

	// Filter actions belonging to this meta-category
	const metaCategoryActions = useMemo(() => {
		return actions.filter((action) => action.metaCategory === metaCategory.id);
	}, [actions, metaCategory.id]);

	// Determine display mode
	const hasPool = Boolean(metaCategory.pool);
	const poolSize = metaCategory.pool?.size ?? 0;

	// Build cost label based on cost model
	const costLabel = useMemo(() => {
		if (metaCategory.costModel === 'global') {
			const amount = metaCategory.globalCostAmount ?? 1;
			return `(${amount} ${bindingIcon ?? ''}${bindingIcon ? ' ' : ''}${bindingLabel} each)`;
		}
		// per-item: costs shown on individual cards
		return null;
	}, [
		metaCategory.costModel,
		metaCategory.globalCostAmount,
		bindingIcon,
		bindingLabel,
	]);

	if (!isVisible) {
		return null;
	}

	// Pool display mode
	if (hasPool) {
		return (
			<section
				className={SECTION_CLASSES}
				aria-disabled={panelDisabled || undefined}
			>
				<div className={HEADER_CLASSES}>
					<h2 className={TITLE_CLASSES}>
						{metaCategory.icon} {metaCategory.label}
						{costLabel && (
							<span className={COST_LABEL_CLASSES}> {costLabel}</span>
						)}
					</h2>
					<div className={POOL_STATUS_CLASSES}>
						{metaCategoryActions.length} of {poolSize} available
					</div>
				</div>
				<PoolSlots
					actions={metaCategoryActions}
					poolSize={poolSize}
					summaries={summaries}
					player={player}
					canInteract={canInteract}
					selectResourceDescriptor={selectResourceDescriptor}
				/>
			</section>
		);
	}

	// List display mode (default)
	return (
		<section
			className={SECTION_CLASSES}
			aria-disabled={panelDisabled || undefined}
		>
			<div className={HEADER_CLASSES}>
				<h2 className={TITLE_CLASSES}>
					{metaCategory.icon} {metaCategory.label}
					{costLabel && (
						<span className={COST_LABEL_CLASSES}> {costLabel}</span>
					)}
				</h2>
			</div>
			<div className="mt-4">
				<BasicOptions
					actions={metaCategoryActions}
					summaries={summaries}
					player={player}
					canInteract={canInteract}
					selectResourceDescriptor={selectResourceDescriptor}
				/>
			</div>
		</section>
	);
}
