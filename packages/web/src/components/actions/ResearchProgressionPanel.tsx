import React, { useMemo } from 'react';
import type {
	ActionConfig,
	ActionMetaCategoryConfig,
	SessionActionState,
} from '@kingdom-builder/protocol';
import type { Summary } from '../../translation';
import { useResourceMetadata } from '../../contexts/RegistryMetadataContext';
import { useGameEngine } from '../../state/GameContext';
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

interface ResearchProgressionPanelProps {
	metaCategory: ActionMetaCategoryConfig;
	actions: Action[];
	summaries: Map<string, Summary>;
	player: DisplayPlayer;
	canInteract: boolean;
	selectResourceDescriptor: ResourceDescriptorSelector;
	panelDisabled: boolean;
}

interface CatalogEntry {
	id: string;
	definition: ActionConfig;
	startingTier: number;
	maxTier: number;
	state: SessionActionState;
}

type CatalogStatus =
	| { kind: 'available' }
	| { kind: 'locked' }
	| { kind: 'completed' }
	| { kind: 'upgraded'; tier: number };

function getTierRange(definition: ActionConfig): {
	startingTier: number;
	maxTier: number;
} {
	const tierKeys = Object.keys(definition.tiers ?? {});
	const tierNumbers = tierKeys.map(Number).filter((n) => !isNaN(n));
	if (tierNumbers.length === 0) {
		return { startingTier: 1, maxTier: 1 };
	}
	return {
		startingTier: Math.min(...tierNumbers),
		maxTier: Math.max(...tierNumbers),
	};
}

function resolveCatalogStatus(entry: CatalogEntry): CatalogStatus {
	if (entry.state.exhausted) {
		return { kind: 'completed' };
	}
	if (entry.state.locked) {
		return { kind: 'locked' };
	}
	if (entry.state.poolLocked) {
		return { kind: 'locked' };
	}
	if (entry.state.currentTier > entry.startingTier) {
		return { kind: 'upgraded', tier: entry.state.currentTier };
	}
	return { kind: 'available' };
}

interface ProgressionCurveProps {
	bindingSpent: number;
	thresholds: ReadonlyArray<{
		bindingSpent: number;
		weights: Record<string, number>;
	}>;
	bindingIcon?: string | undefined;
	bindingLabel: string;
}

function ProgressionCurve({
	bindingSpent,
	thresholds,
	bindingIcon,
	bindingLabel,
}: ProgressionCurveProps) {
	if (thresholds.length === 0) {
		return null;
	}
	const sorted = [...thresholds].sort(
		(a, b) => a.bindingSpent - b.bindingSpent,
	);
	const maxThreshold = sorted[sorted.length - 1]?.bindingSpent ?? 0;
	const trackMax = Math.max(maxThreshold, bindingSpent, 1);
	const currentPercent = Math.min(100, (bindingSpent / trackMax) * 100);
	const barClasses = [
		'relative',
		'h-3',
		'rounded-full',
		'bg-slate-200/70',
		'dark:bg-slate-700/70',
		'overflow-visible',
	].join(' ');
	const fillClasses = [
		'absolute',
		'left-0',
		'top-0',
		'h-full',
		'rounded-full',
		'bg-gradient-to-r',
		'from-emerald-400',
		'to-sky-500',
		'transition-[width]',
	].join(' ');
	return (
		<div className="mb-4">
			<div className="mb-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
				<span className="font-medium uppercase tracking-wider">
					Progression curve
				</span>
				<span>
					{bindingIcon ? `${bindingIcon} ` : ''}
					{bindingSpent} {bindingLabel} spent
				</span>
			</div>
			<div className={barClasses}>
				<div
					className={fillClasses}
					style={{ width: `${currentPercent}%` }}
					aria-hidden="true"
				/>
				{sorted.map((threshold, index) => {
					const position = Math.min(
						100,
						(threshold.bindingSpent / trackMax) * 100,
					);
					const reached = bindingSpent >= threshold.bindingSpent;
					const markerClasses = [
						'absolute',
						'top-1/2',
						'-translate-x-1/2',
						'-translate-y-1/2',
						'h-4',
						'w-4',
						'rounded-full',
						'border-2',
						reached
							? 'border-emerald-500 bg-emerald-300'
							: 'border-slate-400 bg-white dark:bg-slate-800',
					].join(' ');
					const weightEntries = Object.entries(threshold.weights).sort(
						([a], [b]) => Number(a) - Number(b),
					);
					const tooltip = weightEntries
						.map(([tier, weight]) => `T${tier}: ${weight}`)
						.join(' · ');
					return (
						<div
							key={`threshold-${index}`}
							className={markerClasses}
							style={{ left: `${position}%` }}
							title={`At ${threshold.bindingSpent} ${bindingLabel} — ${tooltip}`}
							aria-label={`Threshold at ${threshold.bindingSpent} ${bindingLabel}`}
						/>
					);
				})}
			</div>
			<div className="mt-1 flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
				{sorted.map((threshold, index) => (
					<span key={`label-${index}`}>{threshold.bindingSpent}</span>
				))}
			</div>
		</div>
	);
}

interface CatalogRowProps {
	entry: CatalogEntry;
	status: CatalogStatus;
}

function CatalogRow({ entry, status }: CatalogRowProps) {
	const { definition } = entry;
	const icon = definition.icon ?? '';
	const name = definition.name ?? entry.id;
	const statusClasses = [
		'ml-auto',
		'rounded-full',
		'px-2',
		'py-0.5',
		'text-[10px]',
		'font-semibold',
		'uppercase',
		'tracking-wider',
	];
	let statusLabel: string;
	let statusTone: string;
	switch (status.kind) {
		case 'available':
			statusLabel = 'Available';
			statusTone =
				'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
			break;
		case 'locked':
			statusLabel = 'Locked';
			statusTone =
				'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
			break;
		case 'completed':
			statusLabel = 'Completed';
			statusTone =
				'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';
			break;
		case 'upgraded':
			statusLabel = `Tier ${status.tier}/${entry.maxTier}`;
			statusTone =
				'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
			break;
	}
	const rowClasses = [
		'flex',
		'items-center',
		'gap-2',
		'rounded-md',
		'px-2',
		'py-1',
		'text-sm',
		'text-slate-700',
		'dark:text-slate-200',
		status.kind === 'locked' ? 'opacity-60' : '',
	]
		.filter(Boolean)
		.join(' ');
	return (
		<li className={rowClasses}>
			{icon && <span aria-hidden="true">{icon}</span>}
			<span className="truncate">{name}</span>
			<span className={[...statusClasses, statusTone].join(' ')}>
				{statusLabel}
			</span>
		</li>
	);
}

export default function ResearchProgressionPanel({
	metaCategory,
	actions,
	summaries,
	player,
	canInteract,
	selectResourceDescriptor,
	panelDisabled,
}: ResearchProgressionPanelProps) {
	const { translationContext } = useGameEngine();
	const resourceMetadata = useResourceMetadata();

	const bindingDescriptor = useMemo(
		() =>
			resourceMetadata.byId[metaCategory.bindingResourceId] ??
			resourceMetadata.select(metaCategory.bindingResourceId),
		[resourceMetadata, metaCategory.bindingResourceId],
	);
	const bindingIcon = bindingDescriptor.icon;
	const bindingLabel =
		bindingDescriptor.label ?? metaCategory.bindingResourceId;

	const isVisible = useMemo(() => {
		if (metaCategory.visibilityTrigger === 'always') {
			return true;
		}
		return player.resourceTouched[metaCategory.bindingResourceId] ?? false;
	}, [metaCategory.visibilityTrigger, metaCategory.bindingResourceId, player]);

	const poolSize = metaCategory.pool?.size ?? 0;
	const poolActions = useMemo(
		() => actions.filter((action) => action.metaCategory === metaCategory.id),
		[actions, metaCategory.id],
	);

	const catalogEntries = useMemo<CatalogEntry[]>(() => {
		const entries: CatalogEntry[] = [];
		for (const [id, state] of Object.entries(player.actionStates)) {
			let definition: ActionConfig;
			try {
				definition = translationContext.actions.get(id);
			} catch {
				continue;
			}
			if (definition.metaCategory !== metaCategory.id) {
				continue;
			}
			if (definition.system) {
				continue;
			}
			const { startingTier, maxTier } = getTierRange(definition);
			entries.push({ id, definition, startingTier, maxTier, state });
		}
		return entries;
	}, [player.actionStates, translationContext.actions, metaCategory.id]);

	const groupedByTier = useMemo(() => {
		const map = new Map<number, CatalogEntry[]>();
		for (const entry of catalogEntries) {
			const list = map.get(entry.startingTier) ?? [];
			list.push(entry);
			map.set(entry.startingTier, list);
		}
		for (const list of map.values()) {
			list.sort((a, b) =>
				(a.definition.name ?? a.id).localeCompare(b.definition.name ?? b.id),
			);
		}
		return Array.from(map.entries()).sort(([a], [b]) => a - b);
	}, [catalogEntries]);

	const bindingValue = player.values?.[metaCategory.bindingResourceId] ?? 0;
	const bindingSpent = player.metaCategoryBindingSpent?.[metaCategory.id] ?? 0;

	if (!isVisible) {
		return null;
	}

	return (
		<section
			className={SECTION_CLASSES}
			aria-disabled={panelDisabled || undefined}
		>
			<div className={HEADER_CLASSES}>
				<h2 className={TITLE_CLASSES}>
					{metaCategory.icon} {metaCategory.label}
					<span className={COST_LABEL_CLASSES + ' ml-2'}>
						({bindingIcon ? `${bindingIcon} ` : ''}
						{bindingValue} available · {bindingSpent} spent)
					</span>
				</h2>
				<div className={POOL_STATUS_CLASSES}>
					{poolActions.length} of {poolSize} available
				</div>
			</div>
			<ProgressionCurve
				bindingSpent={bindingSpent}
				thresholds={metaCategory.pool?.fillMode.thresholds ?? []}
				bindingIcon={bindingIcon}
				bindingLabel={bindingLabel}
			/>
			<div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
				Available now
			</div>
			<PoolSlots
				actions={poolActions}
				poolSize={poolSize}
				summaries={summaries}
				player={player}
				canInteract={canInteract}
				selectResourceDescriptor={selectResourceDescriptor}
			/>
			{groupedByTier.length > 0 && (
				<div className="mt-6">
					<div className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
						Catalog
					</div>
					<div className="flex flex-col gap-4">
						{groupedByTier.map(([tier, entries]) => {
							const completed = entries.filter(
								(entry) => entry.state.exhausted,
							).length;
							return (
								<div key={`tier-${tier}`} className="flex flex-col gap-1">
									<div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
										Tier {tier} — {completed}/{entries.length} completed
									</div>
									<ul className="flex flex-col gap-0.5">
										{entries.map((entry) => (
											<CatalogRow
												key={entry.id}
												entry={entry}
												status={resolveCatalogStatus(entry)}
											/>
										))}
									</ul>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</section>
	);
}
