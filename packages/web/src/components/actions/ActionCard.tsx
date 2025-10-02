import React from 'react';
import { type Summary } from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';
import type { Focus } from '@kingdom-builder/contents';

const FOCUS_GRADIENTS: Record<Focus, string> & { default: string } = {
	economy:
		'from-emerald-200/70 to-emerald-100/40 dark:from-emerald-900/40 dark:to-emerald-800/20',
	aggressive:
		'from-amber-200/70 to-orange-100/40 dark:from-amber-900/40 dark:to-orange-900/20',
	defense:
		'from-blue-200/70 to-sky-100/40 dark:from-blue-900/40 dark:to-sky-900/20',
	other:
		'from-rose-200/70 to-rose-100/40 dark:from-rose-900/40 dark:to-rose-800/20',
	default:
		'from-rose-200/70 to-rose-100/40 dark:from-rose-900/40 dark:to-rose-800/20',
};

function stripSummary(
	summary: Summary | undefined,
	requirements: readonly string[],
): Summary | undefined {
	const first = summary?.[0];
	const baseSummary = !first
		? summary
		: typeof first === 'string'
			? summary
			: first.items;
	if (!baseSummary) return baseSummary;
	if (requirements.length === 0) return baseSummary;
	const requirementSet = new Set(
		requirements.map((req) => req.trim()).filter((req) => req.length > 0),
	);
	const filterEntries = (entries: Summary): Summary => {
		const filtered: Summary = [];
		for (const entry of entries) {
			if (typeof entry === 'string') {
				if (requirementSet.has(entry.trim())) continue;
				filtered.push(entry);
			} else {
				const nested = filterEntries(entry.items);
				if (nested.length > 0) {
					filtered.push({ ...entry, items: nested });
				}
			}
		}
		return filtered;
	};
	const filtered = filterEntries(baseSummary);
	return filtered.length > 0 ? filtered : undefined;
}

export type ActionCardProps = {
	title: React.ReactNode;
	costs: Record<string, number>;
	playerResources: Record<string, number>;
	actionCostResource: string;
	upkeep?: Record<string, number> | undefined;
	summary?: Summary | undefined;
	implemented?: boolean;
	enabled: boolean;
	tooltip?: string | undefined;
	requirements?: string[];
	requirementIcons?: string[];
	onClick?: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	focus?: Focus | undefined;
};

export default function ActionCard({
	title,
	costs,
	playerResources,
	actionCostResource,
	upkeep,
	summary,
	implemented = true,
	enabled,
	tooltip,
	requirements = [],
	requirementIcons = [],
	onClick,
	onMouseEnter,
	onMouseLeave,
	focus,
}: ActionCardProps) {
	const focusClass =
		(focus && FOCUS_GRADIENTS[focus]) ?? FOCUS_GRADIENTS.default;
	return (
		<button
			className={`relative panel-card flex h-full flex-col items-start gap-2 border border-white/40 bg-gradient-to-br p-4 text-left shadow-lg shadow-amber-500/10 transition ${
				enabled ? 'hoverable cursor-pointer' : 'cursor-not-allowed opacity-50'
			} ${focusClass}`}
			title={tooltip}
			onClick={enabled ? onClick : undefined}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<span className="text-base font-medium">{title}</span>
			<div className="absolute top-2 right-2 flex flex-col items-end gap-1 text-right">
				{renderCosts(costs, playerResources, actionCostResource, upkeep)}
				{requirements.length > 0 && (
					<div className="flex flex-col items-end gap-0.5 text-xs text-rose-500 dark:text-rose-300">
						<div className="whitespace-nowrap">
							Req
							{requirementIcons.length > 0 && ` ${requirementIcons.join('')}`}
						</div>
					</div>
				)}
			</div>
			<ul className="text-sm list-disc pl-4 text-left">
				{implemented ? (
					renderSummary(stripSummary(summary, requirements))
				) : (
					<li className="italic text-rose-500 dark:text-rose-300">
						Not implemented yet
					</li>
				)}
			</ul>
		</button>
	);
}
