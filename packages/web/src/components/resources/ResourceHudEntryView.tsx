import React from 'react';
import type { TranslationAssets } from '../../translation/context';
import type { ResourceHudEntryNode } from './ResourceHudData';
import { resourceDisplaysAsPercent } from '../../translation/context/assetSelectors';
import type { ResourceV2TierDefinition } from '@kingdom-builder/protocol';

const BADGE_CLASSNAME = [
	'rounded-full border border-white/40 bg-white/70 px-2 py-0.5',
	'text-[0.65rem] font-semibold text-slate-700 shadow-sm shadow-white/30',
	'dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100',
].join(' ');

const PARENT_CLASSNAME = [
	'bar-item flex-col items-start gap-1 text-left',
	'dark:shadow-black/40',
].join(' ');

const CHILD_CLASSNAME = [
	'bar-item ml-6 flex-col items-start gap-1 text-left text-sm',
	'bg-white/60 dark:bg-slate-900/60',
].join(' ');

const STANDALONE_CLASSNAME = 'bar-item text-sm';

const AMOUNT_CLASSNAME = [
	'text-xs font-semibold uppercase tracking-wide text-slate-600',
	'dark:text-slate-300',
].join(' ');

function formatAmount(
	assets: TranslationAssets | undefined,
	resourceId: string,
	amount: number,
): string {
	if (resourceDisplaysAsPercent(assets, resourceId)) {
		return `${amount}%`;
	}
	return new Intl.NumberFormat('en-US').format(amount);
}

function resolveTierLabel(entry: ResourceHudEntryNode): string | undefined {
	const tierId = entry.tier?.tierId;
	if (!tierId) {
		return undefined;
	}
	const track = entry.tierTrack;
	if (!track) {
		return tierId;
	}
	const definition: ResourceV2TierDefinition | undefined = track.tiers.find(
		(tier) => tier.id === tierId,
	);
	const label = definition?.display?.title ?? definition?.display?.summary;
	return label ?? tierId;
}

interface ResourceHudEntryViewProps {
	assets: TranslationAssets | undefined;
	entry: ResourceHudEntryNode;
}

export function ResourceHudEntryView({
	assets,
	entry,
}: ResourceHudEntryViewProps) {
	if (entry.isParent) {
		const visibleChildren = entry.children.filter((child) => child.visible);
		return (
			<div
				data-testid="resource-hud-entry"
				data-resource-id={entry.id}
				className={PARENT_CLASSNAME}
			>
				<ResourceHudRow assets={assets} entry={entry} variant="parent" />
				{visibleChildren.map((child) => (
					<div
						key={child.id}
						data-testid="resource-hud-child"
						data-resource-id={child.id}
						className={CHILD_CLASSNAME}
					>
						<ResourceHudRow assets={assets} entry={child} variant="child" />
					</div>
				))}
			</div>
		);
	}
	return (
		<div
			data-testid="resource-hud-entry"
			data-resource-id={entry.id}
			className={STANDALONE_CLASSNAME}
		>
			<ResourceHudRow assets={assets} entry={entry} variant="standalone" />
		</div>
	);
}

interface ResourceHudRowProps {
	assets: TranslationAssets | undefined;
	entry: ResourceHudEntryNode;
	variant: 'parent' | 'child' | 'standalone';
}

function ResourceHudRow({ assets, entry, variant }: ResourceHudRowProps) {
	const amountText = formatAmount(assets, entry.id, entry.amount);
	const tierLabel = resolveTierLabel(entry);
	const baseClassName =
		variant === 'parent' ? 'text-base font-semibold' : 'text-sm font-semibold';
	return (
		<>
			<div className="flex w-full items-center gap-2">
				<span className={baseClassName}>
					{entry.icon ? `${entry.icon} ` : ''}
					{entry.label}
				</span>
				<span className={AMOUNT_CLASSNAME}>{amountText}</span>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				{entry.bounds?.lowerBound !== undefined ? (
					<span className={BADGE_CLASSNAME}>
						{`≥ ${entry.bounds.lowerBound}`}
					</span>
				) : null}
				{entry.bounds?.upperBound !== undefined ? (
					<span className={BADGE_CLASSNAME}>
						{`≤ ${entry.bounds.upperBound}`}
					</span>
				) : null}
				{tierLabel ? (
					<span className={BADGE_CLASSNAME}>{`Tier: ${tierLabel}`}</span>
				) : null}
			</div>
		</>
	);
}
