import React from 'react';
import type { TranslationAssets } from './context';
import {
	resourceDisplaysAsPercent,
	selectGlobalActionCost,
	selectResourceDisplay,
	selectUpkeepDisplay,
} from './context/assetSelectors';
import type { Summary } from './content';

const EPSILON = 1e-6;

function formatNumber(value: number): string {
	if (Number.isInteger(value)) {
		return value.toString();
	}
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

function formatSigned(value: number): string {
	const magnitude = formatNumber(Math.abs(value));
	const prefix = value >= 0 ? '+' : '-';
	return `${prefix}${magnitude}`;
}

function formatResourceAmount(
	resourceId: string,
	amount: number,
	assets: TranslationAssets | undefined,
): string {
	if (!Number.isFinite(amount)) {
		return '0';
	}
	if (assets && resourceDisplaysAsPercent(assets, resourceId)) {
		return `${formatNumber(amount * 100)}%`;
	}
	return formatNumber(amount);
}

const COST_CONTAINER_CLASS = [
	'flex flex-col items-end text-right text-sm',
	'leading-tight text-gray-600',
	'dark:text-gray-300',
].join(' ');

const COST_ROW_CLASS = 'flex flex-wrap justify-end gap-x-1 gap-y-0.5';
const FREE_LABEL_CLASS = [
	'text-sm text-right text-gray-400',
	'dark:text-gray-500 italic',
].join(' ');
const SHORTFALL_CLASS = 'whitespace-nowrap text-red-500';
const ENTRY_CLASS = 'whitespace-nowrap';

export function renderSummary(summary: Summary | undefined): React.ReactNode {
	return summary?.map((e, i) => {
		if (typeof e === 'string') {
			const trimmed = e.trim();
			const isNoEffect = trimmed === 'No effect';
			const baseClass = 'whitespace-pre-line';
			const className = isNoEffect
				? `${baseClass} italic text-slate-500 dark:text-slate-300`
				: baseClass;
			return (
				<li key={i} className={className}>
					{trimmed}
				</li>
			);
		}
		return (
			<li key={i} className={e.className}>
				<span className="font-semibold">{e.title}</span>
				<ul className="pl-4 space-y-1 list-disc">{renderSummary(e.items)}</ul>
			</li>
		);
	});
}

export function renderCosts(
	costs: Record<string, number | undefined> | undefined,
	resources: Record<string, number>,
	actionCostResource?: string,
	upkeep?: Record<string, number | undefined>,
	options?: { showFreeLabel?: boolean; assets?: TranslationAssets },
) {
	const showFreeLabel = options?.showFreeLabel ?? true;
	const assets = options?.assets;
	const globalCost = assets ? selectGlobalActionCost(assets) : undefined;
	const primaryCostResource = globalCost?.resourceId ?? actionCostResource;
	const entries = Object.entries(costs || {});
	const hasGlobalMetadata = Boolean(globalCost);
	const globalEntry = primaryCostResource
		? entries.find(([resourceKey]) => {
				return resourceKey === primaryCostResource;
			})
		: undefined;
	const otherEntries = entries.filter(([resourceKey]) => {
		if (!primaryCostResource) {
			return true;
		}
		if (!hasGlobalMetadata) {
			return true;
		}
		return resourceKey !== primaryCostResource;
	});
	const upkeepEntries = Object.entries(upkeep || {});
	const globalDeltaNode = (() => {
		if (!globalCost || !globalEntry || !primaryCostResource) {
			return null;
		}
		const totalCost = Number(globalEntry[1] ?? 0);
		if (!Number.isFinite(totalCost)) {
			return null;
		}
		const delta = totalCost - globalCost.amount;
		if (Math.abs(delta) < EPSILON) {
			return null;
		}
		const display = selectResourceDisplay(assets, primaryCostResource);
		const icon = display.icon ?? null;
		const label = display.label;
		const prefix = icon ? `${icon}` : `${label} `;
		const available = resources[primaryCostResource] ?? 0;
		const hasShortfall = available < totalCost;
		const formatted = formatSigned(delta);
		const className = hasShortfall ? SHORTFALL_CLASS : ENTRY_CLASS;
		return (
			<span key={`delta-${primaryCostResource}`} className={className}>
				{`${prefix}${formatted}`}
			</span>
		);
	})();
	const hasGlobalDelta = globalDeltaNode !== null;
	const renderEntry = (
		resourceKey: string,
		amount: number,
		className: string,
	) => {
		const display = selectResourceDisplay(assets, resourceKey);
		const icon = display.icon ?? null;
		const label = display.label;
		const prefix = icon ? `${icon}` : `${label} `;
		const formatted = formatResourceAmount(resourceKey, amount, assets);
		return (
			<span key={resourceKey} className={className}>
				{`${prefix}${formatted}`}
			</span>
		);
	};
	const otherCostNodes = otherEntries.reduce<React.ReactNode[]>(
		(nodes, [resourceKey, costAmount]) => {
			const normalized = Number(costAmount ?? 0);
			if (!Number.isFinite(normalized)) {
				return nodes;
			}
			const available = resources[resourceKey] ?? 0;
			const className = available < normalized ? SHORTFALL_CLASS : ENTRY_CLASS;
			nodes.push(renderEntry(resourceKey, normalized, className));
			return nodes;
		},
		[],
	);
	const upkeepCostNodes = upkeepEntries.reduce<React.ReactNode[]>(
		(nodes, [resourceKey, amount]) => {
			const normalized = Number(amount ?? 0);
			if (!Number.isFinite(normalized)) {
				return nodes;
			}
			nodes.push(renderEntry(resourceKey, normalized, ENTRY_CLASS));
			return nodes;
		},
		[],
	);
	const hasOtherCostNodes = otherCostNodes.length > 0;
	const hasUpkeepCostNodes = upkeepCostNodes.length > 0;
	const showFreeState =
		!hasGlobalDelta && !hasOtherCostNodes && !hasUpkeepCostNodes;
	if (showFreeState) {
		if (!showFreeLabel) {
			return null;
		}
		return <div className={FREE_LABEL_CLASS}>Free</div>;
	}
	let upkeepRow: React.ReactNode = null;
	if (hasUpkeepCostNodes) {
		const upkeepDisplay = selectUpkeepDisplay(assets);
		const upkeepIcon = upkeepDisplay.icon ?? null;
		const upkeepLabel = upkeepDisplay.label;
		const labelText = upkeepIcon ? `${upkeepIcon}` : `${upkeepLabel} `;
		upkeepRow = (
			<div className={COST_ROW_CLASS}>
				<span className="whitespace-nowrap">{labelText}</span>
				{upkeepCostNodes}
			</div>
		);
	}
	return (
		<div className={COST_CONTAINER_CLASS}>
			{(hasGlobalDelta || hasOtherCostNodes) && (
				<div className={COST_ROW_CLASS}>
					{globalDeltaNode}
					{otherCostNodes}
				</div>
			)}
			{upkeepRow}
		</div>
	);
}
