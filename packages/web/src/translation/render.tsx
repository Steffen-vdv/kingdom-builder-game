import React from 'react';
import { RESOURCES, BROOM_ICON } from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
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
			<li key={i}>
				<span className="font-semibold">{e.title}</span>
				<ul className="list-disc pl-4">{renderSummary(e.items)}</ul>
			</li>
		);
	});
}

export function renderCosts(
	costs: Record<string, number | undefined> | undefined,
	resources: Record<string, number>,
	actionCostResource?: string,
	upkeep?: Record<string, number | undefined> | undefined,
) {
	const entries = Object.entries(costs || {}).filter(
		([resourceKey]) =>
			!actionCostResource || resourceKey !== actionCostResource,
	);
	const upkeepEntries = Object.entries(upkeep || {});
	if (entries.length === 0 && upkeepEntries.length === 0) {
		return (
			<div className="text-sm text-right text-gray-400 dark:text-gray-500 italic">
				Free
			</div>
		);
	}
	return (
		<div className="flex flex-col items-end text-right text-sm leading-tight text-gray-600 dark:text-gray-300">
			{entries.length > 0 && (
				<div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
					{entries.map(([resourceKey, costAmount]) => (
						<span
							key={resourceKey}
							className={`whitespace-nowrap ${(resources[resourceKey] ?? 0) < (costAmount ?? 0) ? 'text-red-500' : ''}`}
						>
							{RESOURCES[resourceKey as ResourceKey]?.icon}
							{costAmount ?? 0}
						</span>
					))}
				</div>
			)}
			{upkeepEntries.length > 0 && (
				<div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
					<span className="whitespace-nowrap">{BROOM_ICON}</span>
					{upkeepEntries.map(([resourceKey, upkeepAmount]) => (
						<span key={resourceKey} className="whitespace-nowrap">
							{RESOURCES[resourceKey as ResourceKey]?.icon}
							{upkeepAmount ?? 0}
						</span>
					))}
				</div>
			)}
		</div>
	);
}
