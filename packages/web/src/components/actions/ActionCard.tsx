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

type MultiStepOption = {
	id: string;
	label: string;
};

type MultiStepOptionsFace = {
	kind: 'options';
	groupId: string;
	label: string;
	step: number;
	total: number;
	options: MultiStepOption[];
};

type MultiStepFaceContent = { kind: 'default' } | MultiStepOptionsFace;

type MultiStepStateProps = {
	front: MultiStepFaceContent;
	back: MultiStepFaceContent;
	flipped: boolean;
	visibleFace: 'front' | 'back';
	interactive: boolean;
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
	isMultiStep?: boolean;
	multiStepState?: MultiStepStateProps;
	onSelectMultiStepOption?: (groupId: string, optionId: string) => void;
	onCancelMultiStep?: () => void;
};

function MultiStepIcon() {
	return (
		<div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/80 text-sm font-semibold text-white shadow shadow-amber-500/30">
			⇄
		</div>
	);
}

function DefaultCardFace({
	title,
	costs,
	playerResources,
	actionCostResource,
	summary,
	implemented,
	enabled,
	tooltip,
	requirements,
	requirementIcons,
	focusClass,
	onClick,
	onMouseEnter,
	onMouseLeave,
	isMultiStep,
	upkeep,
}: {
	title: React.ReactNode;
	costs: Record<string, number>;
	playerResources: Record<string, number>;
	actionCostResource: string;
	summary?: Summary | undefined;
	implemented: boolean;
	enabled: boolean;
	tooltip?: string | undefined;
	requirements: string[];
	requirementIcons: string[];
	focusClass: string;
	onClick?: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	isMultiStep: boolean;
	upkeep?: Record<string, number> | undefined;
}) {
	return (
		<button
			className={`panel-card flex h-full min-h-[220px] w-full flex-col items-start gap-2 border border-white/40 bg-gradient-to-br p-4 text-left shadow-lg shadow-amber-500/10 transition ${
				enabled ? 'hoverable cursor-pointer' : 'cursor-not-allowed opacity-50'
			} ${focusClass}`}
			title={tooltip}
			onClick={enabled ? onClick : undefined}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{isMultiStep && <MultiStepIcon />}
			<span className="text-base font-medium">{title}</span>
			<div className="pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-1 text-right">
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
			<ul className="list-disc pl-4 text-left text-sm">
				{implemented ? (
					renderSummary(summary)
				) : (
					<li className="italic text-rose-500 dark:text-rose-300">
						Not implemented yet
					</li>
				)}
			</ul>
		</button>
	);
}

function OptionsCardFace({
	face,
	focusClass,
	onSelect,
	onCancel,
	interactive,
}: {
	face: MultiStepOptionsFace;
	focusClass: string;
	onSelect?: (optionId: string) => void;
	onCancel?: () => void;
	interactive: boolean;
}) {
	const layoutClass =
		face.options.length >= 3
			? 'grid grid-cols-2 gap-3 auto-rows-fr'
			: 'flex flex-col gap-3';
	return (
		<div
			className={`panel-card flex h-full min-h-[220px] w-full flex-col gap-4 border border-white/40 bg-gradient-to-br p-4 text-left shadow-lg shadow-amber-500/10 ${focusClass}`}
		>
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-1">
					<span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
						Step {face.step} of {face.total}
					</span>
					<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
						{face.label}
					</h3>
				</div>
				<button
					type="button"
					aria-label="Cancel multi-step action"
					onClick={interactive ? onCancel : undefined}
					className={`flex h-9 w-9 items-center justify-center rounded-full text-base font-bold text-white shadow-lg shadow-rose-500/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/70 ${
						interactive
							? 'hoverable cursor-pointer'
							: 'cursor-not-allowed opacity-60'
					} bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400`}
				>
					×
				</button>
			</div>
			<div className={layoutClass}>
				{face.options.map((option) => (
					<button
						key={option.id}
						type="button"
						onClick={interactive ? () => onSelect?.(option.id) : undefined}
						className={`group flex h-full flex-col gap-2 rounded-2xl border border-white/50 bg-white/80 p-4 text-left font-semibold text-slate-800 shadow-md shadow-amber-500/10 transition dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100 ${
							interactive
								? 'hoverable cursor-pointer'
								: 'cursor-not-allowed opacity-60'
						}`}
					>
						<span className="text-base font-semibold">{option.label}</span>
					</button>
				))}
			</div>
		</div>
	);
}

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
	isMultiStep = false,
	multiStepState,
	onSelectMultiStepOption,
	onCancelMultiStep,
}: ActionCardProps) {
	const focusClass =
		(focus && FOCUS_GRADIENTS[focus]) ?? FOCUS_GRADIENTS.default;
	const strippedSummary = stripSummary(summary, requirements);
	const frontFace = multiStepState?.front ?? { kind: 'default' };
	const backFace = multiStepState?.back ?? { kind: 'default' };
	const flipped = multiStepState?.flipped ?? false;
	const visibleFace = multiStepState?.visibleFace ?? 'front';
	const interactive = multiStepState?.interactive ?? false;
	const enableFrontInteractions = !multiStepState && enabled;

	return (
		<div className="relative h-full w-full [perspective:1600px]">
			<div
				className={`relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d] ${
					flipped ? '[transform:rotateY(180deg)]' : ''
				}`}
			>
				<div
					className={`absolute inset-0 [backface-visibility:hidden] ${
						visibleFace === 'front'
							? 'pointer-events-auto'
							: 'pointer-events-none'
					}`}
				>
					{frontFace.kind === 'options' ? (
						<OptionsCardFace
							face={frontFace}
							focusClass={focusClass}
							onSelect={(optionId) =>
								onSelectMultiStepOption?.(frontFace.groupId, optionId)
							}
							onCancel={onCancelMultiStep}
							interactive={interactive && visibleFace === 'front'}
						/>
					) : (
						<DefaultCardFace
							title={title}
							costs={costs}
							playerResources={playerResources}
							actionCostResource={actionCostResource}
							summary={strippedSummary}
							implemented={implemented}
							enabled={enableFrontInteractions}
							tooltip={tooltip}
							requirements={requirements}
							requirementIcons={requirementIcons}
							focusClass={focusClass}
							onClick={onClick}
							onMouseEnter={onMouseEnter}
							onMouseLeave={onMouseLeave}
							isMultiStep={isMultiStep && !multiStepState}
							upkeep={upkeep}
						/>
					)}
				</div>
				<div
					className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] ${
						visibleFace === 'back'
							? 'pointer-events-auto'
							: 'pointer-events-none'
					}`}
				>
					{backFace.kind === 'options' ? (
						<OptionsCardFace
							face={backFace}
							focusClass={focusClass}
							onSelect={(optionId) =>
								onSelectMultiStepOption?.(backFace.groupId, optionId)
							}
							onCancel={onCancelMultiStep}
							interactive={interactive && visibleFace === 'back'}
						/>
					) : (
						<DefaultCardFace
							title={title}
							costs={costs}
							playerResources={playerResources}
							actionCostResource={actionCostResource}
							summary={strippedSummary}
							implemented={implemented}
							enabled={false}
							tooltip={tooltip}
							requirements={requirements}
							requirementIcons={requirementIcons}
							focusClass={focusClass}
							isMultiStep={false}
							upkeep={upkeep}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
