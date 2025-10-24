import React from 'react';
import type { TranslationAssets } from './context';
import {
	selectResourceDisplay,
	selectUpkeepDisplay,
} from './context/assetSelectors';
import {
	buildActionCostSummary,
	formatActionCostDelta,
} from './resourceV2/costSummary';
import type { Summary } from './content';

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
	const summary = buildActionCostSummary({
		costs,
		assets,
		...(typeof actionCostResource === 'string' ? { actionCostResource } : {}),
	});
	const entries = summary.entries;
	const upkeepEntries = Object.entries(upkeep || {});
	if (entries.length === 0 && upkeepEntries.length === 0) {
		if (!showFreeLabel) {
			return null;
		}
		return (
			<div className="text-sm text-right text-gray-400 dark:text-gray-500 italic">
				{summary.global ? 'No additional cost' : 'Free'}
			</div>
		);
	}
	const containerClasses = [
		'flex flex-col items-end text-right',
		'text-sm leading-tight text-gray-600',
		'dark:text-gray-300',
	].join(' ');
	const upkeepLabel = (() => {
		const display = selectUpkeepDisplay(assets);
		return display.icon ?? `${display.label} `;
	})();
	const upkeepNodes = upkeepEntries.map(([resourceKey, upkeepAmount]) => {
		const display = selectResourceDisplay(assets, resourceKey);
		const prefix = display.icon ? `${display.icon}` : `${display.label} `;
		const amount = upkeepAmount ?? 0;
		return (
			<span key={resourceKey} className="whitespace-nowrap">
				{`${prefix}${amount}`}
			</span>
		);
	});
	const costNodes = entries.map((entry) => {
		const owned = resources[entry.resourceId] ?? 0;
		const insufficient = owned < entry.total;
		const baseClass = 'whitespace-nowrap';
		const entryClass = [baseClass, insufficient ? 'text-red-500' : '']
			.filter(Boolean)
			.join(' ');
		const costPrefix = entry.icon ? `${entry.icon}` : `${entry.label} `;
		const deltaPrefix = entry.icon ? `${entry.icon} ` : `${entry.label} `;
		let text: string;
		if (entry.kind === 'delta') {
			const deltaText = formatActionCostDelta(entry.amount);
			text = `Δ ${deltaPrefix}${deltaText}`;
		} else {
			text = `${costPrefix}${entry.total}`;
		}
		const key = `${entry.kind}:${entry.resourceId}`;
		return (
			<span key={key} className={entryClass}>
				{text}
			</span>
		);
	});
	return (
		<div className={containerClasses}>
			{entries.length > 0 && (
				<div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
					{costNodes}
				</div>
			)}
			{upkeepEntries.length > 0 && (
				<div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
					<span className="whitespace-nowrap">{upkeepLabel}</span>
					{upkeepNodes}
				</div>
			)}
		</div>
	);
}
