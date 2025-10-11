import React from 'react';
import type { TranslationAssets, TranslationIconLabel } from './context';
import type { Summary } from './content';
import { formatDetailText } from '../utils/stats/format';

export type ResourceDisplaySelector = (
	key: string,
) => TranslationIconLabel | undefined;

const DEFAULT_UPKEEP_ICON = '🧹';

export function createResourceDisplaySelector(
	assets: TranslationAssets,
): ResourceDisplaySelector {
	return (key) => {
		const display = assets.resources[key];
		if (display) {
			return display;
		}
		const label = formatDetailText(key);
		return { label };
	};
}

export function selectUpkeepIcon(assets: TranslationAssets): string {
	return (
		assets.misc.upkeep?.icon ||
		assets.triggers.onPayUpkeepStep?.icon ||
		assets.misc.maintenance?.icon ||
		DEFAULT_UPKEEP_ICON
	);
}

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
	upkeep?: Record<string, number | undefined> | undefined,
	options?: {
		showFreeLabel?: boolean;
		selectResourceDisplay?: ResourceDisplaySelector;
		upkeepIcon?: string;
	},
) {
	const showFreeLabel = options?.showFreeLabel ?? true;
	const selectResourceDisplay = options?.selectResourceDisplay;
	const entries = Object.entries(costs || {}).filter(
		([resourceKey]) =>
			!actionCostResource || resourceKey !== actionCostResource,
	);
	const upkeepEntries = Object.entries(upkeep || {});
	if (entries.length === 0 && upkeepEntries.length === 0) {
		if (!showFreeLabel) {
			return null;
		}
		return (
			<div className="text-sm text-right text-gray-400 dark:text-gray-500 italic">
				Free
			</div>
		);
	}
	return (
		<div
			className={[
				'flex flex-col items-end text-right text-sm leading-tight text-gray-600',
				'dark:text-gray-300',
			].join(' ')}
		>
			{entries.length > 0 && (
				<div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
					{entries.map(([resourceKey, costAmount]) => {
						const display = selectResourceDisplay?.(resourceKey);
						const current = resources[resourceKey] ?? 0;
						const required = costAmount ?? 0;
						const insufficient = current < required;
						const prefix =
							display?.icon ?? display?.label ?? formatDetailText(resourceKey);
						return (
							<span
								key={resourceKey}
								className={`whitespace-nowrap ${
									insufficient ? 'text-red-500' : ''
								}`}
							>
								{prefix}
								{prefix ? ' ' : ''}
								{required}
							</span>
						);
					})}
				</div>
			)}
			{upkeepEntries.length > 0 && (
				<div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
					<span className="whitespace-nowrap">
						{options?.upkeepIcon ?? DEFAULT_UPKEEP_ICON}
					</span>
					{upkeepEntries.map(([resourceKey, upkeepAmount]) => {
						const display = selectResourceDisplay?.(resourceKey);
						const prefix =
							display?.icon ?? display?.label ?? formatDetailText(resourceKey);
						return (
							<span key={resourceKey} className="whitespace-nowrap">
								{prefix}
								{prefix ? ' ' : ''}
								{upkeepAmount ?? 0}
							</span>
						);
					})}
				</div>
			)}
		</div>
	);
}
