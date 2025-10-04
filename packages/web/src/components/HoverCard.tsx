import React, { useEffect, useRef, useState } from 'react';
import { renderSummary, renderCosts } from '../translation/render';
import { useGameEngine } from '../state/GameContext';

const FADE_DURATION_MS = 200;

export default function HoverCard() {
	const { hoverCard, clearHoverCard, ctx, actionCostResource } =
		useGameEngine();
	const [renderedCard, setRenderedCard] = useState<typeof hoverCard>(hoverCard);
	const [isVisible, setIsVisible] = useState(false);
	const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		if (showTimeoutRef.current) {
			clearTimeout(showTimeoutRef.current);
			showTimeoutRef.current = null;
		}
		if (hideTimeoutRef.current) {
			clearTimeout(hideTimeoutRef.current);
			hideTimeoutRef.current = null;
		}

		if (hoverCard) {
			if (renderedCard !== hoverCard) {
				setRenderedCard(hoverCard);
			}
			showTimeoutRef.current = setTimeout(() => {
				setIsVisible(true);
				showTimeoutRef.current = null;
			}, 0);
		} else if (renderedCard) {
			setIsVisible(false);
			hideTimeoutRef.current = setTimeout(() => {
				setRenderedCard(null);
				hideTimeoutRef.current = null;
			}, FADE_DURATION_MS);
		} else {
			setIsVisible(false);
		}

		return () => {
			if (showTimeoutRef.current) {
				clearTimeout(showTimeoutRef.current);
				showTimeoutRef.current = null;
			}
		};
	}, [hoverCard, renderedCard]);

	useEffect(() => {
		return () => {
			if (showTimeoutRef.current) {
				clearTimeout(showTimeoutRef.current);
			}
			if (hideTimeoutRef.current) {
				clearTimeout(hideTimeoutRef.current);
			}
		};
	}, []);

	if (!renderedCard) {
		return null;
	}
	const {
		title,
		costs,
		upkeep,
		effects,
		effectsTitle,
		bgClass,
		description,
		descriptionTitle,
		descriptionClass,
		requirements,
	} = renderedCard;
	const visibilityClass = isVisible
		? 'opacity-100 translate-y-0'
		: 'opacity-0 translate-y-2';
	return (
		<div
			className={`pointer-events-none w-full rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl shadow-amber-500/10 transition-opacity transition-transform duration-200 ease-out dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-900/60 frosted-surface ${[
				bgClass,
				visibilityClass,
			]
				.filter(Boolean)
				.join(' ')}`}
			onMouseLeave={clearHoverCard}
		>
			<div className="mb-3 flex items-start justify-between gap-4">
				<div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
					{title}
				</div>
				<div className="text-right text-sm text-slate-600 dark:text-slate-300">
					{renderCosts(
						costs,
						ctx.activePlayer.resources,
						actionCostResource,
						upkeep,
					)}
				</div>
			</div>
			{effects.length > 0 && (
				<div className="mb-2">
					<div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
						{effectsTitle ?? 'Effects'}
					</div>
					<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
						{renderSummary(effects)}
					</ul>
				</div>
			)}
			{(() => {
				const desc = description;
				const hasDescription =
					typeof desc === 'string'
						? desc.trim().length > 0
						: Array.isArray(desc) && desc.length > 0;
				if (!hasDescription) {
					return null;
				}
				return (
					<div className="mt-2">
						<div
							className={`text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300 ${
								descriptionClass ?? ''
							}`}
						>
							{descriptionTitle ?? 'Description'}
						</div>
						{typeof desc === 'string' ? (
							<div
								className={`mt-1 text-sm text-slate-700 dark:text-slate-200 ${
									descriptionClass ?? ''
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
			{requirements.length > 0 && (
				<div className="mt-2 text-sm text-rose-600 dark:text-rose-300">
					<div className="text-xs font-semibold uppercase tracking-[0.3em]">
						Requirements
					</div>
					<ul className="mt-1 list-disc space-y-1 pl-5">
						{requirements.map((r, i) => (
							<li key={i}>{r}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
