import React from 'react';
import type { TranslationAssets } from './context';
import {
	selectGlobalActionCost,
	selectResourceDisplay,
	selectUpkeepDisplay,
} from './context/assetSelectors';
import type { Summary } from './content';

const FREE_LABEL_CLASS =
	'text-sm text-right text-gray-400 italic dark:text-gray-500';
const COST_ROW_CLASS = 'flex flex-wrap justify-end gap-x-1 gap-y-0.5';
const COST_CONTAINER_CLASS = [
	'flex flex-col items-end text-right text-sm leading-tight',
	'text-gray-600',
	'dark:text-gray-300',
].join(' ');

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
	const globalCost = selectGlobalActionCost(assets);

	if (globalCost) {
		const globalResourceId = globalCost.resourceId ?? actionCostResource ?? '';
		const baseAmount = globalCost.amount ?? 0;
		const allEntries = Object.entries(costs ?? {});
		const globalEntry = allEntries.find(
			([resourceKey]) => resourceKey === globalResourceId,
		);
		const parsedGlobalAmount = Number(globalEntry?.[1]);
		const hasGlobalEntry = Number.isFinite(parsedGlobalAmount);
		const hasGlobalDelta = hasGlobalEntry && parsedGlobalAmount !== baseAmount;
		const otherEntries = allEntries.filter(
			([resourceKey]) => resourceKey !== globalResourceId,
		);
		const upkeepEntries = Object.entries(upkeep || {});
		const hasEntries =
			hasGlobalDelta || otherEntries.length > 0 || upkeepEntries.length > 0;

		if (!hasEntries) {
			if (!showFreeLabel) {
				return null;
			}
			return <div className={FREE_LABEL_CLASS}>Free</div>;
		}

		const renderDelta = (
			resourceId: string,
			delta: number,
			required: number,
		) => {
			if (delta === 0) {
				return null;
			}
			const display = selectResourceDisplay(assets, resourceId);
			const amountText = `${delta >= 0 ? '+' : ''}${delta}`;
			const prefix = display.icon ? `${display.icon}` : `${display.label} `;
			const available = Number(resources[resourceId] ?? 0);
			const insufficient = Number.isFinite(required)
				? available < required
				: false;
			const className = [
				'whitespace-nowrap',
				insufficient ? 'text-red-500' : '',
			]
				.filter(Boolean)
				.join(' ');
			const title = display.description ?? undefined;
			return (
				<span key={resourceId} className={className} title={title}>
					{`${prefix}${amountText}`}
				</span>
			);
		};

		const resolvedGlobalAmount = hasGlobalEntry
			? parsedGlobalAmount
			: baseAmount;
		const globalDeltaNode = hasGlobalDelta
			? renderDelta(
					globalResourceId,
					resolvedGlobalAmount - baseAmount,
					resolvedGlobalAmount,
				)
			: null;
		const otherDeltaNodes = otherEntries
			.map(([resourceId, amount]) => {
				const normalized = Number(amount ?? 0);
				if (!Number.isFinite(normalized) || normalized === 0) {
					return null;
				}
				return renderDelta(resourceId, -normalized, normalized);
			})
			.filter(Boolean);
		const upkeepDeltaNodes = upkeepEntries
			.map(([resourceId, amount]) => {
				const normalized = Number(amount ?? 0);
				if (!Number.isFinite(normalized) || normalized === 0) {
					return null;
				}
				return renderDelta(resourceId, -normalized, normalized);
			})
			.filter(Boolean);
		const upkeepDisplay =
			upkeepDeltaNodes.length > 0 ? selectUpkeepDisplay(assets) : undefined;
		const showUpkeepSummary =
			Boolean(upkeepDisplay) && upkeepDeltaNodes.length > 0;
		const upkeepLabel = upkeepDisplay?.icon
			? `${upkeepDisplay.icon}`
			: upkeepDisplay?.label
				? `${upkeepDisplay.label} `
				: '';
		const upkeepTitle = upkeepDisplay?.description ?? undefined;

		return (
			<div className={COST_CONTAINER_CLASS}>
				{globalDeltaNode && (
					<div className={COST_ROW_CLASS}>{globalDeltaNode}</div>
				)}
				{otherDeltaNodes.length > 0 && (
					<div className={COST_ROW_CLASS}>{otherDeltaNodes}</div>
				)}
				{showUpkeepSummary && (
					<div className={COST_ROW_CLASS}>
						<span className="whitespace-nowrap" title={upkeepTitle}>
							{upkeepLabel}
						</span>
						{upkeepDeltaNodes}
					</div>
				)}
			</div>
		);
	}

	const filteredEntries = Object.entries(costs || {}).filter(
		([resourceKey]) =>
			!actionCostResource || resourceKey !== actionCostResource,
	);
	const upkeepEntries = Object.entries(upkeep || {});
	if (filteredEntries.length === 0 && upkeepEntries.length === 0) {
		if (!showFreeLabel) {
			return null;
		}
		return <div className={FREE_LABEL_CLASS}>Free</div>;
	}

	const legacyCostNodes = filteredEntries
		.map(([resourceKey, costAmount]) => {
			const normalized = Number(costAmount ?? 0);
			if (!Number.isFinite(normalized) || normalized === 0) {
				return null;
			}
			const available = Number(resources[resourceKey] ?? 0);
			const display = selectResourceDisplay(assets, resourceKey);
			const prefix = display.icon ? `${display.icon}` : `${display.label} `;
			const className = [
				'whitespace-nowrap',
				available < normalized ? 'text-red-500' : '',
			]
				.filter(Boolean)
				.join(' ');
			return (
				<span key={resourceKey} className={className}>
					{`${prefix}${normalized}`}
				</span>
			);
		})
		.filter(Boolean);
	const fallbackUpkeepDisplay = selectUpkeepDisplay(assets);
	const fallbackUpkeepLabel = fallbackUpkeepDisplay.icon
		? `${fallbackUpkeepDisplay.icon}`
		: `${fallbackUpkeepDisplay.label} `;
	const legacyUpkeepNodes = upkeepEntries
		.map(([resourceKey, upkeepAmount]) => {
			const normalized = Number(upkeepAmount ?? 0);
			if (!Number.isFinite(normalized) || normalized === 0) {
				return null;
			}
			const display = selectResourceDisplay(assets, resourceKey);
			const prefix = display.icon ? `${display.icon}` : `${display.label} `;
			return (
				<span key={resourceKey} className="whitespace-nowrap">
					{`${prefix}${normalized}`}
				</span>
			);
		})
		.filter(Boolean);

	return (
		<div className={COST_CONTAINER_CLASS}>
			{legacyCostNodes.length > 0 && (
				<div className={COST_ROW_CLASS}>{legacyCostNodes}</div>
			)}
			{legacyUpkeepNodes.length > 0 && (
				<div className={COST_ROW_CLASS}>
					<span className="whitespace-nowrap">{fallbackUpkeepLabel}</span>
					{legacyUpkeepNodes}
				</div>
			)}
		</div>
	);
}
