import {
	selectResourceDisplay,
	selectGlobalActionCost,
} from '../context/assetSelectors';
import type { TranslationAssets } from '../context';

export interface ActionCostDisplayEntry {
	readonly resourceId: string;
	readonly amount: number;
	readonly total: number;
	readonly icon?: string;
	readonly label: string;
	readonly kind: 'delta' | 'cost';
}

export interface ActionCostSummaryDisplay {
	readonly global?: {
		readonly resourceId: string;
		readonly baseAmount: number;
		readonly totalAmount: number;
		readonly icon?: string;
		readonly label: string;
		readonly description?: string;
	};
	readonly entries: readonly ActionCostDisplayEntry[];
}

interface BuildSummaryOptions {
	readonly costs: Record<string, number | undefined> | undefined;
	readonly assets: TranslationAssets | undefined;
	readonly actionCostResource?: string;
}

function normalizeAmount(value: number | undefined): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	const normalized = Number(value);
	if (!Number.isFinite(normalized)) {
		return undefined;
	}
	return normalized;
}

function coerceBaseAmount(
	globalAmount: number | undefined,
	costAmount: number | undefined,
): number | undefined {
	if (globalAmount !== undefined) {
		return globalAmount;
	}
	if (costAmount !== undefined) {
		return costAmount;
	}
	return undefined;
}

function coerceLabel(
	assets: TranslationAssets | undefined,
	resourceId: string,
	fallback: string | undefined,
): { label: string } | { label: string; icon: string } {
	const display = selectResourceDisplay(assets, resourceId);
	const label = display.label ?? fallback ?? resourceId;
	const icon = display.icon;
	if (icon) {
		return { icon, label };
	}
	return { label };
}

export function buildActionCostSummary({
	costs,
	assets,
	actionCostResource,
}: BuildSummaryOptions): ActionCostSummaryDisplay {
	const entries: ActionCostDisplayEntry[] = [];
	const normalizedCosts = costs ?? {};
	const globalDisplay = selectGlobalActionCost(assets);
	const globalResourceId = globalDisplay?.resourceId ?? actionCostResource;
	const globalCostAmount = normalizeAmount(
		globalResourceId ? normalizedCosts[globalResourceId] : undefined,
	);
	const baseAmount = coerceBaseAmount(globalDisplay?.amount, globalCostAmount);
	let globalSummary: ActionCostSummaryDisplay['global'];

	if (globalResourceId && baseAmount !== undefined) {
		const totalAmount = globalCostAmount ?? 0;
		const labelInfo = coerceLabel(
			assets,
			globalResourceId,
			globalDisplay?.label,
		);
		const summaryBase: {
			resourceId: string;
			baseAmount: number;
			totalAmount: number;
			label: string;
			description?: string;
			icon?: string;
		} = {
			resourceId: globalResourceId,
			baseAmount,
			totalAmount,
			label: labelInfo.label,
		};
		if (globalDisplay?.description) {
			summaryBase.description = globalDisplay.description;
		}
		if ('icon' in labelInfo) {
			summaryBase.icon = labelInfo.icon;
		}
		globalSummary = summaryBase as ActionCostSummaryDisplay['global'];
		const delta = totalAmount - baseAmount;
		if (delta !== 0) {
			const entryBase: ActionCostDisplayEntry =
				'icon' in labelInfo
					? {
							resourceId: globalResourceId,
							amount: delta,
							total: totalAmount,
							label: labelInfo.label,
							kind: 'delta',
							icon: labelInfo.icon,
						}
					: {
							resourceId: globalResourceId,
							amount: delta,
							total: totalAmount,
							label: labelInfo.label,
							kind: 'delta',
						};
			entries.push(entryBase);
		}
	}

	for (const [resourceId, value] of Object.entries(normalizedCosts)) {
		if (resourceId === globalResourceId) {
			continue;
		}
		const amount = normalizeAmount(value);
		if (amount === undefined) {
			continue;
		}
		const labelInfo = coerceLabel(assets, resourceId, undefined);
		const entryBase: ActionCostDisplayEntry =
			'icon' in labelInfo
				? {
						resourceId,
						amount,
						total: amount,
						label: labelInfo.label,
						kind: 'cost',
						icon: labelInfo.icon,
					}
				: {
						resourceId,
						amount,
						total: amount,
						label: labelInfo.label,
						kind: 'cost',
					};
		entries.push(entryBase);
	}

	const readonlyEntries = entries as ReadonlyArray<ActionCostDisplayEntry>;
	if (globalSummary) {
		return {
			global: globalSummary,
			entries: readonlyEntries,
		} satisfies ActionCostSummaryDisplay;
	}
	return {
		entries: readonlyEntries,
	} satisfies ActionCostSummaryDisplay;
}

export function formatActionCostDelta(amount: number): string {
	const sign = amount >= 0 ? '+' : '';
	return `${sign}${amount}`;
}
