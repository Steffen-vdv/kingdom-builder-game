import React, { useEffect, useRef, useState } from 'react';
import { renderSummary, renderCosts } from '../translation/render';
import { useGameEngine } from '../state/GameContext';

const FADE_DURATION_MS = 200;

export default function HoverCard() {
	const {
		hoverCard: data,
		clearHoverCard,
		ctx,
		actionCostResource,
	} = useGameEngine();
	const [renderedData, setRenderedData] = useState(data);
	const [transitionState, setTransitionState] = useState<'enter' | 'exit'>(
		data ? 'enter' : 'exit',
	);
	const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
	const showRafRef = useRef<number>();

	useEffect(() => {
		if (!data) {
			return;
		}

		if (hideTimeoutRef.current) {
			clearTimeout(hideTimeoutRef.current);
			hideTimeoutRef.current = undefined;
		}

		setRenderedData(data);

		if (typeof window === 'undefined') {
			setTransitionState('enter');
			return;
		}

		if (showRafRef.current) {
			cancelAnimationFrame(showRafRef.current);
		}

		showRafRef.current = window.requestAnimationFrame(() => {
			setTransitionState('enter');
			showRafRef.current = undefined;
		});
	}, [data]);

	useEffect(() => {
		if (data) {
			return;
		}

		if (!renderedData) {
			setTransitionState('exit');
			return;
		}

		setTransitionState('exit');
		hideTimeoutRef.current = setTimeout(() => {
			setRenderedData(null);
			hideTimeoutRef.current = undefined;
		}, FADE_DURATION_MS);

		return () => {
			if (hideTimeoutRef.current) {
				clearTimeout(hideTimeoutRef.current);
				hideTimeoutRef.current = undefined;
			}
		};
	}, [data, renderedData]);

	useEffect(
		() => () => {
			if (hideTimeoutRef.current) {
				clearTimeout(hideTimeoutRef.current);
			}
			if (showRafRef.current) {
				cancelAnimationFrame(showRafRef.current);
			}
		},
		[],
	);

	if (!renderedData) {
		return null;
	}

	return (
		<div
			data-state={transitionState}
			className={`hover-card-transition pointer-events-none w-full rounded-3xl border border-white/60 bg-white/80 p-6 shadow-2xl shadow-amber-500/10 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-slate-900/60 frosted-surface ${
				renderedData.bgClass ?? ''
			}`}
			onMouseLeave={clearHoverCard}
		>
			<div className="mb-3 flex items-start justify-between gap-4">
				<div className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
					{renderedData.title}
				</div>
				<div className="text-right text-sm text-slate-600 dark:text-slate-300">
					{renderCosts(
						renderedData.costs,
						ctx.activePlayer.resources,
						actionCostResource,
						renderedData.upkeep,
					)}
				</div>
			</div>
			{renderedData.effects.length > 0 && (
				<div className="mb-2">
					<div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-300">
						{renderedData.effectsTitle ?? 'Effects'}
					</div>
					<ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
						{renderSummary(renderedData.effects)}
					</ul>
				</div>
			)}
			{(() => {
				const desc = renderedData.description;
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
								renderedData.descriptionClass ?? ''
							}`}
						>
							{renderedData.descriptionTitle ?? 'Description'}
						</div>
						{typeof desc === 'string' ? (
							<div
								className={`mt-1 text-sm text-slate-700 dark:text-slate-200 ${
									renderedData.descriptionClass ?? ''
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
			{renderedData.requirements.length > 0 && (
				<div className="mt-2 text-sm text-rose-600 dark:text-rose-300">
					<div className="text-xs font-semibold uppercase tracking-[0.3em]">
						Requirements
					</div>
					<ul className="mt-1 list-disc space-y-1 pl-5">
						{renderedData.requirements.map((r, i) => (
							<li key={i}>{r}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
