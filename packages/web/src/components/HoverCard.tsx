import React from 'react';
import { renderSummary, renderCosts } from '../translation/render';
import { useGameEngine } from '../state/GameContext';

export default function HoverCard() {
	const {
		hoverCard: data,
		clearHoverCard,
		ctx,
		actionCostResource,
	} = useGameEngine();
	if (!data) return null;
	return (
		<div
			className={`pointer-events-none w-full rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur-xl transition dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-900/60 ${
				data.bgClass ?? ''
			}`}
			onMouseLeave={clearHoverCard}
		>
			<div className="mb-3 flex items-start justify-between gap-4">
				<div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
					{data.title}
				</div>
				<div className="text-right text-sm text-slate-600 dark:text-slate-300">
					{renderCosts(
						data.costs,
						ctx.activePlayer.resources,
						actionCostResource,
						data.upkeep,
					)}
				</div>
			</div>
			{data.effects.length > 0 && (
				<div className="mb-2">
					<div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
						{data.effectsTitle ?? 'Effects'}
					</div>
					<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
						{renderSummary(data.effects)}
					</ul>
				</div>
			)}
			{(() => {
				const desc = data.description;
				const hasDescription =
					typeof desc === 'string'
						? desc.trim().length > 0
						: Array.isArray(desc) && desc.length > 0;
				if (!hasDescription) return null;
				return (
					<div className="mt-2">
						<div
							className={`text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300 ${
								data.descriptionClass ?? ''
							}`}
						>
							{data.descriptionTitle ?? 'Description'}
						</div>
						{typeof desc === 'string' ? (
							<div
								className={`mt-1 text-sm text-slate-700 dark:text-slate-200 ${
									data.descriptionClass ?? ''
								}`}
							>
								{desc}
							</div>
						) : (
							<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
								{renderSummary(desc)}
							</ul>
						)}
					</div>
				);
			})()}
			{data.requirements.length > 0 && (
				<div className="mt-2 text-sm text-rose-600 dark:text-rose-300">
					<div className="text-xs font-semibold uppercase tracking-[0.3em]">
						Requirements
					</div>
					<ul className="mt-1 list-disc space-y-1 pl-5">
						{data.requirements.map((r, i) => (
							<li key={i}>{r}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
