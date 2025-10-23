import React, { useMemo } from 'react';
import type {
	ResourceV2BoundsMetadata,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import type {
	SessionPlayerStateSnapshot,
	SessionResourceTierStateSnapshot,
	SessionResourceValueSnapshot,
} from '@kingdom-builder/protocol/session';
import { useGameEngine } from '../../state/GameContext';

interface ResourceHudProps {
	player: SessionPlayerStateSnapshot;
}

interface ResourceEntry {
	id: string;
	label: string;
	icon?: string;
	amount: number;
	touched: boolean;
	parentId?: string;
	order: number;
	isPercent: boolean;
	bounds?: ResourceV2BoundsMetadata;
	tierTrack?: ResourceV2TierTrackDefinition;
	tier?: SessionResourceTierStateSnapshot;
	visible: boolean;
}

interface ResourceRow {
	entry: ResourceEntry;
	variant: 'parent' | 'child' | 'standalone';
}

const BADGE_CLASS = [
	'inline-flex items-center rounded-full border border-slate-400/50',
	'bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
	'text-slate-700 dark:border-slate-500/40 dark:bg-slate-800/80 dark:text-slate-200',
].join(' ');

const ROW_CLASS = [
	'flex items-start justify-between gap-3',
	'rounded-lg px-3 py-2 text-sm transition-opacity',
	'dark:text-slate-100',
].join(' ');

const PARENT_ROW_CLASS = [
	'bg-white/70 font-semibold text-slate-900',
	'shadow-sm shadow-slate-900/5 dark:bg-slate-900/60 dark:text-slate-100',
].join(' ');

const CHILD_ROW_CLASS =
	'bg-white/50 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200';

const STANDALONE_ROW_CLASS =
	'bg-white/60 text-slate-900 dark:bg-slate-900/50 dark:text-slate-100';

const CHILD_INDENT_CLASS =
	'ml-5 border-l border-slate-300/60 pl-4 dark:border-slate-600/60';

const VALUE_CLASS =
	'text-base font-semibold text-slate-900 dark:text-slate-100';

const LABEL_CLASS = 'text-left';

const LABEL_CONTAINER_CLASS = 'flex items-center gap-2';

function formatValue(amount: number, isPercent: boolean): string {
	const numeric = Number.isFinite(amount) ? amount : 0;
	const formatter = new Intl.NumberFormat(undefined, {
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	});
	if (isPercent) {
		return `${formatter.format(numeric)}%`;
	}
	return formatter.format(numeric);
}

function resolveTierLabel(
	tierTrack: ResourceV2TierTrackDefinition | undefined,
	tier: SessionResourceTierStateSnapshot | undefined,
): string | undefined {
	if (!tierTrack || !tier?.tierId) {
		return undefined;
	}
	const match = tierTrack.tiers.find(
		(definition) => definition.id === tier.tierId,
	);
	if (!match) {
		return tier.tierId;
	}
	const title = match.display?.title ?? match.id;
	return title;
}

function buildEntry(
	id: string,
	value: SessionResourceValueSnapshot | undefined,
	definitionOrder: number,
	icon?: string,
	label?: string,
	isPercent?: boolean,
	bounds?: ResourceV2BoundsMetadata,
	tierTrack?: ResourceV2TierTrackDefinition,
): ResourceEntry {
	const amount = value?.amount ?? 0;
	const touched = value?.touched ?? false;
	const entry: ResourceEntry = {
		id,
		label: label ?? id,
		amount,
		touched,
		order: definitionOrder,
		isPercent: Boolean(isPercent),
		visible: touched || amount !== 0,
	} satisfies ResourceEntry;
	if (value?.parent?.id !== undefined) {
		entry.parentId = value.parent.id;
	}
	if (bounds !== undefined) {
		entry.bounds = bounds;
	}
	if (tierTrack !== undefined) {
		entry.tierTrack = tierTrack;
	}
	if (value?.tier !== undefined) {
		entry.tier = value.tier;
	}
	if (icon !== undefined) {
		entry.icon = icon;
	}
	return entry;
}

function buildBadges(
	entry: ResourceEntry,
	hasVisibleChildren: boolean,
): string[] {
	const badges: string[] = [];
	const { bounds } = entry;
	if (bounds?.lowerBound !== undefined) {
		badges.push(`\u2265${bounds.lowerBound}`);
	}
	if (bounds?.upperBound !== undefined) {
		badges.push(`\u2264${bounds.upperBound}`);
	}
	const tierLabel = resolveTierLabel(entry.tierTrack, entry.tier);
	if (tierLabel) {
		badges.push(`Tier: ${tierLabel}`);
	}
	if (!entry.touched && entry.amount === 0 && !hasVisibleChildren) {
		badges.push('Untouched');
	}
	return badges;
}

function orderEntries(left: ResourceEntry, right: ResourceEntry): number {
	if (left.order !== right.order) {
		return left.order - right.order;
	}
	return left.label.localeCompare(right.label);
}

export default function ResourceHud({ player }: ResourceHudProps) {
	const { translationContext } = useGameEngine();
	const resourceSelectors = translationContext.assets.resourceV2;
	const resourceAssets = translationContext.assets.resources;
	const values = player.values;
	const rows = useMemo(() => {
		if (!values || resourceSelectors.nodes.size === 0) {
			return [] as ResourceRow[];
		}
		const entries = new Map<string, ResourceEntry>();
		const entryIds = new Set<string>([
			...Object.keys(values),
			...resourceSelectors.nodes.keys(),
		]);
		for (const id of entryIds) {
			const metadata = resourceSelectors.nodes.get(id);
			const display = metadata?.display;
			const value = values[id];
			const icon = resourceAssets[id]?.icon ?? display?.icon;
			const label = resourceAssets[id]?.label ?? display?.name;
			const order = display?.order ?? Number.MAX_SAFE_INTEGER;
			const isPercent = resourceSelectors.displaysAsPercent(id);
			const bounds = resourceSelectors.selectBounds(id);
			const tierTrack = resourceSelectors.selectTierTrack(id);
			entries.set(
				id,
				buildEntry(id, value, order, icon, label, isPercent, bounds, tierTrack),
			);
		}
		const parentToChildren = new Map<string, ResourceEntry[]>();
		for (const entry of entries.values()) {
			if (!entry.parentId) {
				continue;
			}
			const list = parentToChildren.get(entry.parentId) ?? [];
			list.push(entry);
			parentToChildren.set(entry.parentId, list);
		}
		const processed = new Set<string>();
		const orderedTopLevel = Array.from(entries.values())
			.filter((entry) => !entry.parentId)
			.sort(orderEntries);
		const computedRows: ResourceRow[] = [];
		for (const entry of orderedTopLevel) {
			const children = parentToChildren.get(entry.id) ?? [];
			children.sort(orderEntries);
			const hasVisibleChild = children.some((child) => child.visible);
			if (entry.visible || hasVisibleChild) {
				computedRows.push({
					entry,
					variant: children.length ? 'parent' : 'standalone',
				});
				processed.add(entry.id);
			}
			for (const child of children) {
				if (!child.visible) {
					continue;
				}
				computedRows.push({
					entry: child,
					variant: 'child',
				});
				processed.add(child.id);
			}
		}
		for (const entry of entries.values()) {
			if (processed.has(entry.id)) {
				continue;
			}
			if (!entry.visible) {
				continue;
			}
			const hasParent = Boolean(entry.parentId);
			computedRows.push({
				entry,
				variant: hasParent ? 'child' : 'standalone',
			});
		}
		return computedRows;
	}, [values, resourceAssets, resourceSelectors]);

	if (rows.length === 0) {
		return null;
	}

	const labelGroupClass = `${LABEL_CONTAINER_CLASS} ${LABEL_CLASS}`;

	const renderRowElement = (
		entry: ResourceEntry,
		rowClass: string,
		badges: string[],
		valueLabel: string,
	) => (
		<li key={entry.id} className={rowClass} data-resource-id={entry.id}>
			<div className={labelGroupClass}>
				{entry.icon && (
					<span aria-hidden="true" className="text-lg">
						{entry.icon}
					</span>
				)}
				<span>{entry.label}</span>
			</div>
			<div className="flex flex-wrap items-center justify-end gap-2">
				<span className={VALUE_CLASS}>{valueLabel}</span>
				{badges.map((badge) => (
					<span key={badge} className={BADGE_CLASS}>
						{badge}
					</span>
				))}
			</div>
		</li>
	);

	return (
		<ul className="m-0 list-none space-y-2 p-0" data-resource-hud="true">
			{rows.map((row) => {
				const { entry, variant } = row;
				const hasVisibleChildren = rows.some((row) => {
					if (row.entry.parentId !== entry.id) {
						return false;
					}
					return row.entry.visible || row.variant === 'child';
				});
				const badges = buildBadges(entry, hasVisibleChildren);
				const variantClass =
					variant === 'parent'
						? PARENT_ROW_CLASS
						: variant === 'child'
							? CHILD_ROW_CLASS
							: STANDALONE_ROW_CLASS;
				const shouldDim =
					!entry.touched && entry.amount === 0 && !hasVisibleChildren;
				const rowClass = [
					ROW_CLASS,
					variantClass,
					shouldDim ? 'opacity-60' : '',
					variant === 'child' ? CHILD_INDENT_CLASS : '',
				]
					.filter(Boolean)
					.join(' ');
				const valueLabel = formatValue(entry.amount, entry.isPercent);
				return renderRowElement(entry, rowClass, badges, valueLabel);
			})}
		</ul>
	);
}
