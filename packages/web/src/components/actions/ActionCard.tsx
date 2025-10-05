import React from 'react';
import type { Focus } from '@kingdom-builder/contents';
import { type Summary } from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';
import { FOCUS_GRADIENTS } from './focusGradients';
import { stripSummary } from './stripSummary';

export type ActionCardOption = {
	id: string;
	label: string;
	icon?: string;
	summary?: string;
	description?: string;
	disabled?: boolean;
	onSelect: () => void;
	onMouseEnter?: (() => void) | undefined;
	onMouseLeave?: (() => void) | undefined;
	compact?: boolean;
};

export type ActionCardVariant = 'front' | 'back';

export interface ActionCardProps {
	title: React.ReactNode;
	costs: Record<string, number>;
	playerResources: Record<string, number>;
	actionCostResource: string;
	upkeep?: Record<string, number> | undefined;
	summary?: Summary | undefined;
	implemented?: boolean | undefined;
	enabled: boolean;
	tooltip?: string | undefined;
	requirements?: string[];
	requirementIcons?: string[];
	onClick?: (() => void) | undefined;
	onMouseEnter?: (() => void) | undefined;
	onMouseLeave?: (() => void) | undefined;
	focus?: Focus | undefined;
	variant?: ActionCardVariant | undefined;
	stepIndex?: number | undefined;
	stepCount?: number | undefined;
	stepLabel?: string | undefined;
	promptTitle?: React.ReactNode | undefined;
	promptSummary?: string | undefined;
	promptDescription?: string | undefined;
	options?: ActionCardOption[] | undefined;
	onCancel?: (() => void) | undefined;
	multiStep?: boolean | undefined;
}

function StepBadge({
	stepIndex: _stepIndex,
	stepCount: _stepCount,
	stepLabel,
	variant,
	multiStep,
}: {
	stepIndex: number | undefined;
	stepCount: number | undefined;
	stepLabel: string | undefined;
	variant: ActionCardVariant;
	multiStep: boolean | undefined;
}) {
	if (variant === 'back') {
		const label = stepLabel?.trim();
		if (!label) {
			return null;
		}
		return (
			<div className="action-card__badge">
				<span className="action-card__badge-pill">{label}</span>
			</div>
		);
	}
	if (!multiStep || variant !== 'front') {
		return null;
	}
	return (
		<div className="action-card__badge">
			<span
				className="action-card__multi-step"
				role="img"
				aria-label="Multi-step action"
				title="Multi-step action"
			>
				<svg
					className="action-card__multi-step-icon"
					viewBox="0 0 16 16"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M3.25 12.75h3.5v-3.5h3.5V5.75H13.5"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="M11.25 3.75L13.75 6l-2.5 2.25"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</span>
		</div>
	);
}

function OptionCard({ option }: { option: ActionCardOption }) {
	const icon = option.icon?.trim();
	const label = option.label.trim();
	const ariaLabel = label.length > 0 ? label : option.id;
	const optionClass = [
		'action-card__option',
		option.compact ? 'action-card__option--compact' : '',
		option.disabled ? 'opacity-50 cursor-not-allowed' : 'hoverable',
	]
		.filter(Boolean)
		.join(' ');
	const compactVisual = icon || (label.length > 0 ? label[0] : '–');
	return (
		<button
			type="button"
			className={optionClass}
			onClick={option.disabled ? undefined : option.onSelect}
			disabled={option.disabled}
			style={{ cursor: option.disabled ? 'not-allowed' : 'pointer' }}
			onMouseEnter={option.onMouseEnter}
			onMouseLeave={option.onMouseLeave}
			aria-label={ariaLabel}
			title={option.compact ? ariaLabel : undefined}
		>
			{option.compact ? (
				<>
					<span
						aria-hidden="true"
						className="action-card__option-compact-visual"
					>
						{compactVisual}
					</span>
					<span className="sr-only">{ariaLabel}</span>
				</>
			) : (
				<>
					<span className="action-card__option-header">
						{icon ? (
							<span aria-hidden="true" className="action-card__option-icon">
								{icon}
							</span>
						) : null}
						<span className="action-card__option-title">{label}</span>
					</span>
					{option.summary ? (
						<p className="action-card__option-summary">{option.summary}</p>
					) : null}
					{option.description ? (
						<p className="action-card__option-description">
							{option.description}
						</p>
					) : null}
				</>
			)}
		</button>
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
	variant = 'front',
	stepIndex,
	stepCount,
	stepLabel,
	promptTitle,
	promptSummary,
	promptDescription,
	options = [],
	onCancel,
	multiStep = false,
}: ActionCardProps) {
	const focusClass =
		(focus && FOCUS_GRADIENTS[focus]) ?? FOCUS_GRADIENTS.default;
	const isBack = variant === 'back';
	const interactive = !isBack && enabled;
	const containerClass = `action-card panel-card relative h-full bg-gradient-to-br ${focusClass} ${
		interactive
			? 'hoverable cursor-pointer'
			: isBack
				? 'cursor-default'
				: 'cursor-not-allowed opacity-50'
	}`;

	const requirementBadge =
		requirements.length > 0 ? (
			<div className="flex flex-col items-end gap-0.5 text-xs text-rose-500 dark:text-rose-300">
				<div className="whitespace-nowrap">
					Req
					{requirementIcons.length > 0 && ` ${requirementIcons.join('')}`}
				</div>
			</div>
		) : null;

	const renderedSummary = implemented ? (
		renderSummary(stripSummary(summary, requirements))
	) : (
		<li className="italic text-rose-500 dark:text-rose-300">
			Not implemented yet
		</li>
	);

	return (
		<div
			className={containerClass}
			data-face={variant}
			title={tooltip}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			<StepBadge
				stepIndex={stepIndex}
				stepCount={stepCount}
				stepLabel={stepLabel}
				variant={variant}
				multiStep={multiStep}
			/>
			<div className="action-card__inner">
				<button
					type="button"
					className="action-card__face action-card__face--front"
					onClick={interactive ? onClick : undefined}
					disabled={!interactive}
				>
					<div className="flex h-full flex-col items-start gap-2 p-4 text-left">
						<span className="text-base font-medium">{title}</span>
						<div className="absolute top-2 right-2 flex flex-col items-end gap-1 text-right">
							{renderCosts(costs, playerResources, actionCostResource, upkeep)}
							{requirementBadge}
						</div>
						<ul className="action-card__summary">{renderedSummary}</ul>
					</div>
				</button>
				<div className="action-card__face action-card__face--back">
					<div className="flex h-full flex-col gap-3 p-4">
						<div className="flex items-start justify-between gap-2">
							<div className="flex flex-col gap-1">
								{promptTitle && (
									<span className="text-base font-semibold">{promptTitle}</span>
								)}
								{promptSummary && (
									<p className="text-sm text-slate-600 dark:text-slate-300">
										{promptSummary}
									</p>
								)}
								{promptDescription && (
									<p className="text-xs text-slate-500 dark:text-slate-400">
										{promptDescription}
									</p>
								)}
							</div>
							{onCancel && (
								<button
									type="button"
									className="action-card__cancel"
									onClick={onCancel}
									aria-label="Cancel selection"
									title="Cancel selection"
									style={{ cursor: 'pointer' }}
								>
									×
								</button>
							)}
						</div>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{options.length > 0 ? (
								options.map((option) => (
									<OptionCard key={option.id} option={option} />
								))
							) : (
								<div className="text-sm text-slate-600 dark:text-slate-300">
									No options available.
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
