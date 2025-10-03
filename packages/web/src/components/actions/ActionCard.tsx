import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { type Summary } from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';
import type { ActionEffectGroupConfig, Focus } from '@kingdom-builder/contents';

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
	multiStep?: {
		groups: ActionEffectGroupConfig[];
		onComplete: (selections: { groupId: string; optionId: string }[]) => void;
		onCancel?: () => void;
	};
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
	const focusClass =
		(focus && FOCUS_GRADIENTS[focus]) ?? FOCUS_GRADIENTS.default;
	const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
	const [selected, setSelected] = useState<
		{ groupId: string; optionId: string }[]
	>([]);
	const [finalizing, setFinalizing] = useState(false);
	const timeoutRef = useRef<number>();
	const groups = multiStep?.groups ?? [];
	const totalSteps = groups.length;
	const hasMultiStep = groups.length > 0;
	const isFlipped = hasMultiStep && activeGroupIndex !== null;
	const FLIP_DURATION = 500;

	const clearTimeoutRef = useCallback(() => {
		if (timeoutRef.current) {
			window.clearTimeout(timeoutRef.current);
			timeoutRef.current = undefined;
		}
	}, []);

	const resetMultiStep = useCallback(
		(notifyCancel: boolean) => {
			clearTimeoutRef();
			setActiveGroupIndex(null);
			setSelected([]);
			setFinalizing(false);
			if (notifyCancel) multiStep?.onCancel?.();
		},
		[clearTimeoutRef, multiStep],
	);

	useEffect(() => () => clearTimeoutRef(), [clearTimeoutRef]);

	useEffect(() => {
		if (!enabled && activeGroupIndex !== null) {
			resetMultiStep(false);
		}
	}, [enabled, activeGroupIndex, resetMultiStep]);

	useEffect(() => {
		if (!hasMultiStep) {
			resetMultiStep(false);
		}
	}, [hasMultiStep, resetMultiStep]);

	useEffect(() => {
		if (isFlipped) onMouseLeave?.();
	}, [isFlipped, onMouseLeave]);

	const currentGroup: ActionEffectGroupConfig | undefined = useMemo(() => {
		if (!hasMultiStep || activeGroupIndex === null) return undefined;
		return groups[activeGroupIndex];
	}, [activeGroupIndex, groups, hasMultiStep]);

	const optionLayoutClass = useMemo(() => {
		const count = currentGroup?.options.length ?? 0;
		if (count >= 3)
			return 'grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-2 gap-3';
		return 'grid grid-cols-1 sm:grid-cols-2 gap-3';
	}, [currentGroup]);

	const stepLabel = useMemo(() => {
		if (!hasMultiStep || totalSteps === 0) return 'Choose an option';
		return `Step ${(activeGroupIndex ?? 0) + 1} of ${totalSteps}`;
	}, [activeGroupIndex, hasMultiStep, totalSteps]);

	const handleStart = () => {
		if (!enabled) return;
		if (!hasMultiStep) {
			onClick?.();
			return;
		}
		onMouseLeave?.();
		setSelected([]);
		setActiveGroupIndex(0);
	};

	const finalizeSelections = (
		nextSelections: {
			groupId: string;
			optionId: string;
		}[],
	) => {
		setFinalizing(true);
		clearTimeoutRef();
		timeoutRef.current = window.setTimeout(() => {
			setActiveGroupIndex(null);
			setSelected([]);
			setFinalizing(false);
			multiStep?.onComplete(nextSelections);
		}, FLIP_DURATION);
	};

	const handleOption = (optionId: string) => {
		if (!multiStep || !currentGroup) return;
		if (finalizing) return;
		const nextSelections = [
			...selected,
			{ groupId: currentGroup.id, optionId },
		];
		setSelected(nextSelections);
		const isLast = activeGroupIndex === groups.length - 1;
		if (isLast) {
			finalizeSelections(nextSelections);
		} else {
			setActiveGroupIndex((index) => (index ?? 0) + 1);
		}
	};

	const handleCancel = () => {
		if (!hasMultiStep) return;
		resetMultiStep(true);
	};

	const handleMouseEnterCard = () => {
		if (isFlipped) return;
		onMouseEnter?.();
	};

	const faceBaseClass = `panel-card absolute inset-0 flex h-full flex-col items-start gap-2 rounded-3xl border border-white/40 bg-gradient-to-br p-4 text-left shadow-lg shadow-amber-500/10 transition-transform duration-500 ease-out dark:border-white/10 ${focusClass}`;

	return (
		<div
			className="relative h-full min-h-[220px] w-full [perspective:1600px]"
			onMouseEnter={handleMouseEnterCard}
			onMouseLeave={onMouseLeave}
			title={isFlipped ? undefined : tooltip}
		>
			<div
				className="relative h-full w-full transform-gpu transition-transform duration-500 [transform-style:preserve-3d]"
				style={{
					transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
				}}
			>
				<div
					className={`${faceBaseClass} ${
						enabled
							? 'hoverable cursor-pointer'
							: 'cursor-not-allowed opacity-50'
					} ${isFlipped ? 'pointer-events-none' : 'pointer-events-auto'} [backface-visibility:hidden]`}
					onClick={handleStart}
				>
					{hasMultiStep && (
						<div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-slate-900/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm dark:bg-white/10 dark:text-slate-100">
							<svg
								aria-hidden
								className="h-3 w-3"
								viewBox="0 0 16 16"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M3 2h5l2 3h3v3h-2l2 3H8l-2-3H3V5h2L3 2z"
									className="fill-current"
								/>
							</svg>
							<span>Multi-step</span>
						</div>
					)}
					<span className="text-base font-medium">{title}</span>
					<div className="absolute right-2 top-2 flex flex-col items-end gap-1 text-right">
						{renderCosts(costs, playerResources, actionCostResource, upkeep)}
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
					<ul className="list-disc pl-4 text-left text-sm">
						{implemented ? (
							renderSummary(stripSummary(summary, requirements))
						) : (
							<li className="italic text-rose-500 dark:text-rose-300">
								Not implemented yet
							</li>
						)}
					</ul>
				</div>
				<div
					className={`${faceBaseClass} ${
						isFlipped ? 'pointer-events-auto' : 'pointer-events-none opacity-0'
					} flex gap-4 [backface-visibility:hidden] [transform:rotateY(180deg)]`}
				>
					<button
						type="button"
						className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-rose-500/40 transition hover:from-rose-400 hover:to-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/70"
						onClick={handleCancel}
					>
						✕
					</button>
					<div className="flex w-full flex-col gap-4 pr-2">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
								{stepLabel}
							</p>
							<h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
								{currentGroup?.title ?? 'Choose an option'}
							</h4>
						</div>
						<div className={optionLayoutClass}>
							{currentGroup?.options.map((option) => (
								<button
									key={option.id}
									type="button"
									className={`flex h-full flex-col gap-1 rounded-2xl border border-white/40 bg-white/75 p-3 text-left text-sm font-medium text-slate-800 shadow-md shadow-amber-500/10 transition hoverable dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 dark:shadow-slate-900/40 ${
										finalizing ? 'pointer-events-none opacity-60' : ''
									}`}
									onClick={() => handleOption(option.id)}
								>
									<span>{option.label}</span>
									{option.description && (
										<span className="text-xs font-normal text-slate-600 dark:text-slate-300">
											{option.description}
										</span>
									)}
								</button>
							))}
						</div>
						<p className="mt-auto text-xs text-slate-500 dark:text-slate-300">
							Pick one option to continue. Choices are placeholders for demo
							purposes.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
