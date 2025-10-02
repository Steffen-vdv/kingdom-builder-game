import React from 'react';
import { type Summary } from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';
import type { Focus } from '@kingdom-builder/contents';

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

export type MultiStepOption = {
	key: string;
	label: React.ReactNode;
	description?: React.ReactNode;
	onSelect: () => void;
};

export type MultiStepConfig = {
	icon?: React.ReactNode;
	isActive: boolean;
	totalSteps: number;
	currentStep?: number;
	title?: React.ReactNode;
	options?: MultiStepOption[];
	onCancel?: () => void;
	contentKey: string;
};

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
	multiStep?: MultiStepConfig;
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
	multiStep,
}: ActionCardProps) {
	const focusClass = (() => {
		switch (focus) {
			case 'economy':
				return 'from-emerald-200/70 to-emerald-100/40 dark:from-emerald-900/40 dark:to-emerald-800/20';
			case 'aggressive':
				return 'from-amber-200/70 to-orange-100/40 dark:from-amber-900/40 dark:to-orange-900/20';
			case 'defense':
				return 'from-blue-200/70 to-sky-100/40 dark:from-blue-900/40 dark:to-sky-900/20';
			default:
				return 'from-rose-200/70 to-rose-100/40 dark:from-rose-900/40 dark:to-rose-800/20';
		}
	})();
	const multiStepIcon = multiStep ? (multiStep.icon ?? '🔀') : null;
	const [visibleKey, setVisibleKey] = React.useState(
		multiStep?.contentKey ?? 'front',
	);
	const [rotation, setRotation] = React.useState(0);
	const [animateRotation, setAnimateRotation] = React.useState(false);
	const targetKey = multiStep?.contentKey ?? 'front';
	const hasMultiStep = Boolean(multiStep);
	const isActiveMultiStep = Boolean(multiStep?.isActive);
	const showOptions =
		hasMultiStep && isActiveMultiStep && visibleKey !== 'front';
	const options = showOptions ? (multiStep?.options ?? []) : [];
	const currentStep = multiStep?.currentStep ?? 0;
	const totalSteps = multiStep?.totalSteps ?? 0;
	const showCancel = Boolean(showOptions && multiStep?.onCancel);
	const clickable = enabled && !isActiveMultiStep;

	React.useEffect(() => {
		if (targetKey === visibleKey) return;
		const halfDuration = 180;
		const fullDuration = halfDuration * 2 + 40;
		setAnimateRotation(true);
		setRotation(90);
		const midpoint = window.setTimeout(() => {
			setAnimateRotation(false);
			setVisibleKey(targetKey);
			setRotation(-90);
			window.requestAnimationFrame(() => {
				setAnimateRotation(true);
				setRotation(0);
			});
		}, halfDuration);
		const finish = window.setTimeout(() => {
			setAnimateRotation(false);
			setRotation(0);
		}, fullDuration);
		return () => {
			window.clearTimeout(midpoint);
			window.clearTimeout(finish);
		};
	}, [targetKey, visibleKey]);

	return (
		<div
			className={`relative panel-card flex h-full min-h-[11rem] flex-col items-start gap-2 border border-white/40 bg-gradient-to-br p-4 text-left shadow-lg shadow-amber-500/10 transition ${
				clickable
					? 'hoverable cursor-pointer'
					: enabled
						? ''
						: 'cursor-not-allowed opacity-50'
			} ${focusClass}`}
			title={tooltip}
			role="button"
			tabIndex={clickable ? 0 : -1}
			aria-disabled={!clickable && enabled ? true : undefined}
			onClick={(event) => {
				if (!clickable) return;
				onClick?.();
				event.stopPropagation();
			}}
			onKeyDown={(event) => {
				if (!clickable) return;
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					onClick?.();
				}
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{multiStepIcon && (
				<span
					className="pointer-events-none absolute left-3 top-3 text-lg"
					aria-hidden
				>
					{multiStepIcon}
				</span>
			)}
			<div className="relative w-full" style={{ perspective: '1200px' }}>
				<div
					className="flex h-full w-full flex-col gap-2"
					style={{
						transform: `rotateY(${rotation}deg)`,
						transformStyle: 'preserve-3d',
						transition: animateRotation
							? 'transform 0.36s cubic-bezier(0.4, 0, 0.2, 1)'
							: 'none',
					}}
				>
					{showOptions ? (
						<>
							<div className="flex items-start justify-between gap-2">
								<div>
									<p className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">
										Step {Math.min(currentStep + 1, totalSteps)} of{' '}
										{Math.max(totalSteps, 1)}
									</p>
									<p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
										{multiStep?.title ?? 'Choose an effect'}
									</p>
								</div>
								{showCancel && (
									<button
										type="button"
										onClick={(event) => {
											event.stopPropagation();
											multiStep?.onCancel?.();
										}}
										className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/60 bg-white/80 text-sm font-semibold text-slate-700 shadow transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:bg-slate-800"
										aria-label="Cancel action"
									>
										×
									</button>
								)}
							</div>
							<div className="flex flex-col gap-2">
								{options.length > 0 ? (
									options.map((option) => (
										<button
											key={option.key}
											type="button"
											onClick={(event) => {
												event.stopPropagation();
												option.onSelect();
											}}
											className="flex flex-col items-start gap-1 rounded-xl border border-white/40 bg-white/70 px-4 py-3 text-left text-sm font-medium text-slate-800 shadow hover:border-amber-400 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-amber-400/60 dark:hover:bg-slate-800"
										>
											<span>{option.label}</span>
											{option.description && (
												<span className="text-xs font-normal text-slate-600 dark:text-slate-300">
													{option.description}
												</span>
											)}
										</button>
									))
								) : (
									<div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
										No options available
									</div>
								)}
							</div>
						</>
					) : (
						<>
							<span
								className={`text-base font-medium ${multiStepIcon ? 'ml-6' : ''}`}
							>
								{title}
							</span>
							<div className="absolute top-2 right-2 flex flex-col items-end gap-1 text-right">
								{renderCosts(
									costs,
									playerResources,
									actionCostResource,
									upkeep,
								)}
								{requirements.length > 0 && (
									<div className="flex flex-col items-end gap-0.5 text-xs text-rose-500 dark:text-rose-300">
										<div className="whitespace-nowrap">
											Req
											{requirementIcons.length > 0 &&
												` ${requirementIcons.join('')}`}
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
						</>
					)}
				</div>
			</div>
		</div>
	);
}
