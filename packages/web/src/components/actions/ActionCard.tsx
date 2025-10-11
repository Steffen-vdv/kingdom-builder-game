import React from 'react';
import { type Summary } from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';
import OptionList from './OptionList';
import StepBadge from './StepBadge';
import { type ActionCardOption } from './OptionCard';
import { resolveFocusGradient } from './focusGradients';
import type { FocusId } from './types';
import { stripSummary } from './stripSummary';

export type { ActionCardOption } from './OptionCard';

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
	focus?: FocusId | undefined;
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
}: ActionCardProps): JSX.Element {
	const focusClass = resolveFocusGradient(focus);
	const isBack = variant === 'back';
	const interactive = !isBack && enabled;
	const containerClass = [
		'action-card',
		'panel-card',
		'relative',
		'h-full',
		'bg-gradient-to-br',
		focusClass,
		interactive
			? 'hoverable cursor-pointer'
			: isBack
				? 'cursor-default'
				: 'cursor-not-allowed opacity-50',
	]
		.filter(Boolean)
		.join(' ');
	const requirementBadgeClass = [
		'flex',
		'flex-col',
		'items-end',
		'gap-0.5',
		'text-xs',
		'text-rose-500',
		'dark:text-rose-300',
	].join(' ');
	const costBlockClass = [
		'absolute',
		'top-2',
		'right-2',
		'flex',
		'flex-col',
		'items-end',
		'gap-1',
		'text-right',
	].join(' ');
	const frontContentClass = [
		'flex',
		'h-full',
		'flex-col',
		'items-start',
		'gap-2',
		'p-4',
		'text-left',
	].join(' ');
	const promptHeaderClass = [
		'flex',
		'items-start',
		'justify-between',
		'gap-2',
	].join(' ');

	const requirementBadge =
		requirements.length > 0 ? (
			<div className={requirementBadgeClass}>
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
					<div className={frontContentClass}>
						<span className="text-base font-medium">{title}</span>
						<div className={costBlockClass}>
							{renderCosts(costs, playerResources, actionCostResource, upkeep)}
							{requirementBadge}
						</div>
						<ul className="action-card__summary">{renderedSummary}</ul>
					</div>
				</button>
				<div className="action-card__face action-card__face--back">
					<div className="flex h-full flex-col gap-3 p-4">
						<div className={promptHeaderClass}>
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
						<OptionList options={options} />
					</div>
				</div>
			</div>
		</div>
	);
}
