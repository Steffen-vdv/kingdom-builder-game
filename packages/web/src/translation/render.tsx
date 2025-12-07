import React from 'react';
import type {
	TranslationAssets,
	TranslationResourceMetadataSelectors,
} from './context';
import { selectUpkeepDisplay } from './context/assetSelectors';
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

interface RenderCostsOptions {
	showFreeLabel?: boolean;
	assets?: TranslationAssets;
	resourceMetadata?: TranslationResourceMetadataSelectors;
}

export function renderCosts(
	costs: Record<string, number | undefined> | undefined,
	resources: Record<string, number>,
	actionCostResource?: string,
	upkeep?: Record<string, number | undefined>,
	options?: RenderCostsOptions,
) {
	const showFreeLabel = options?.showFreeLabel ?? true;
	const assets = options?.assets;
	const resourceMetadata = options?.resourceMetadata;
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

	const getResourceDisplay = (resourceKey: string) => {
		if (resourceMetadata) {
			const metadata = resourceMetadata.get(resourceKey);
			return { icon: metadata.icon, label: metadata.label };
		}
		// Fallback to resource key as label
		return { icon: undefined, label: resourceKey };
	};

	return (
		<div
			className={[
				'flex flex-col items-end text-right text-sm leading-tight text-gray-600',
				'dark:text-gray-300',
			].join(' ')}
		>
			{entries.length > 0 && (
				<div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
					{entries.map(([resourceKey, costAmount]) => (
						<span
							key={resourceKey}
							className={`whitespace-nowrap ${
								(resources[resourceKey] ?? 0) < (costAmount ?? 0)
									? 'text-red-500'
									: ''
							}`}
						>
							{(() => {
								const display = getResourceDisplay(resourceKey);
								const prefix = display.icon
									? `${display.icon}`
									: `${display.label} `;
								return `${prefix}${costAmount ?? 0}`;
							})()}
						</span>
					))}
				</div>
			)}
			{upkeepEntries.length > 0 && (
				<div className="flex flex-wrap justify-end gap-x-1 gap-y-0.5">
					<span className="whitespace-nowrap">
						{(() => {
							const upkeepDisplay = selectUpkeepDisplay(assets);
							return upkeepDisplay.icon ?? `${upkeepDisplay.label} `;
						})()}
					</span>
					{upkeepEntries.map(([resourceKey, upkeepAmount]) => (
						<span key={resourceKey} className="whitespace-nowrap">
							{(() => {
								const display = getResourceDisplay(resourceKey);
								const prefix = display.icon
									? `${display.icon}`
									: `${display.label} `;
								return `${prefix}${upkeepAmount ?? 0}`;
							})()}
						</span>
					))}
				</div>
			)}
		</div>
	);
}
