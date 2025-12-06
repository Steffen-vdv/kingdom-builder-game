import type { ReactElement, ReactNode } from 'react';
import { type Summary } from '../../translation';
import type {
	TranslationAssets,
	TranslationResourceV2MetadataSelectors,
} from '../../translation/context';
import { renderSummary, renderCosts } from '../../translation/render';
import OptionList from './OptionList';
import StepBadge, { MultiStepIndicator } from './StepBadge';
import { type ActionCardOption } from './OptionCard';
import { FOCUS_GRADIENTS } from './focusGradients';
import { stripSummary } from './stripSummary';
import type { ActionFocus } from './types';

export type { ActionCardOption } from './OptionCard';

export type ActionCardVariant = 'front' | 'back';

export interface ActionCardProps {
	title: ReactNode;
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
	focus?: ActionFocus | undefined;
	variant?: ActionCardVariant | undefined;
	stepIndex?: number | undefined;
	stepCount?: number | undefined;
	stepLabel?: string | undefined;
	promptTitle?: ReactNode | undefined;
	promptSummary?: string | undefined;
	promptDescription?: string | undefined;
	options?: ActionCardOption[] | undefined;
	onCancel?: (() => void) | undefined;
	multiStep?: boolean | undefined;
	assets: TranslationAssets;
	resourceMetadataV2?: TranslationResourceV2MetadataSelectors;
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
	stepIndex: _stepIndex,
	stepCount: _stepCount,
	stepLabel,
	promptTitle,
	promptSummary,
	promptDescription,
	options = [],
	onCancel,
	multiStep = false,
	assets,
	resourceMetadataV2,
}: ActionCardProps): ReactElement {
	const focusClass =
		(focus && FOCUS_GRADIENTS[focus]) ?? FOCUS_GRADIENTS.default;
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
		'flex',
		'flex-col',
		'items-end',
		'gap-1',
		'text-right',
	].join(' ');
	const frontContentClass = [
		'flex',
		'h-full',
		'w-full',
		'flex-col',
		'items-start',
		'gap-3',
		'p-4',
		'text-left',
	].join(' ');
	const frontHeaderClass = [
		'flex',
		'w-full',
		'items-start',
		'justify-between',
		'gap-3',
	].join(' ');
	const titleGroupClass = ['flex', 'items-center', 'gap-2'].join(' ');
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

	const backBadge = <StepBadge variant={variant} stepLabel={stepLabel} />;
	const frontMultiStepBadge =
		variant === 'front' && multiStep ? (
			<MultiStepIndicator className="mt-0.5 shrink-0" />
		) : null;

	return (
		<div
			className={containerClass}
			data-face={variant}
			title={tooltip}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{backBadge}
			<div className="action-card__inner">
				<button
					type="button"
					className="action-card__face action-card__face--front"
					onClick={interactive ? onClick : undefined}
					disabled={!interactive}
				>
					<div className={frontContentClass}>
						<div className={frontHeaderClass}>
							<div className={titleGroupClass}>
								{frontMultiStepBadge}
								<span className="text-base font-medium">{title}</span>
							</div>
							<div className={costBlockClass}>
								{renderCosts(
									costs,
									playerResources,
									actionCostResource,
									upkeep,
									{
										assets,
										...(resourceMetadataV2 && { resourceMetadataV2 }),
									},
								)}
								{requirementBadge}
							</div>
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
