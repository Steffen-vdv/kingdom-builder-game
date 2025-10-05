import React, { useEffect, useMemo } from 'react';
import TimerCircle from '../TimerCircle';
import { useGameEngine, type PhaseStep } from '../../state/GameContext';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { useAnimate } from '../../utils/useAutoAnimate';
import Button from '../common/Button';

type PhasePanelProps = {
	height?: number;
};

const PhasePanel = React.forwardRef<HTMLDivElement, PhasePanelProps>(
	({ height }, ref) => {
		const {
			ctx,
			phaseSteps,
			setPhaseSteps,
			phaseTimer,
			displayPhase,
			setDisplayPhase,
			phaseHistories,
			tabsEnabled,
			handleEndTurn,
		} = useGameEngine();

		const actionPhaseId = useMemo(() => {
			const phaseWithAction = ctx.phases.find(
				(phaseDefinition) => phaseDefinition.action,
			);
			return phaseWithAction?.id;
		}, [ctx]);
		const isActionPhase = isActionPhaseActive(
			ctx.game.currentPhase,
			actionPhaseId,
			tabsEnabled,
		);

		const phaseStepsRef = useAnimate<HTMLUListElement>();

		useEffect(() => {
			const phaseStepsElement = phaseStepsRef.current;
			if (!phaseStepsElement) {
				return;
			}
			phaseStepsElement.scrollTo({
				top: phaseStepsElement.scrollHeight,
				behavior: 'smooth',
			});
		}, [phaseSteps]);

		const phaseTabs = ctx.phases.map((phase) => {
			const isSelected = displayPhase === phase.id;
			const baseTabClassSegments = [
				'relative flex items-center gap-2 rounded-full',
				'px-4 py-2 text-sm transition-all',
			];
			const selectedTabSegments = [
				'bg-gradient-to-r from-blue-500/90 to-indigo-500/90',
				'text-white shadow-lg shadow-blue-500/30',
			];
			const idleTabSegments = [
				'text-slate-600 hover:bg-white/60 hover:text-slate-800',
				'dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100',
			];
			const tabSegments = isSelected ? selectedTabSegments : idleTabSegments;
			const tabClasses = [
				...baseTabClassSegments,
				...tabSegments,
				tabsEnabled ? null : 'opacity-60',
			]
				.filter(Boolean)
				.join(' ');
			const handleSelectPhase = () => {
				if (!tabsEnabled) {
					return;
				}
				setDisplayPhase(phase.id);
				const nextSteps: PhaseStep[] = phaseHistories[phase.id] ?? [];
				setPhaseSteps(nextSteps);
			};
			return (
				<Button
					key={phase.id}
					type="button"
					disabled={!tabsEnabled}
					onClick={handleSelectPhase}
					variant="ghost"
					className={tabClasses}
				>
					<span className="text-lg leading-none">{phase.icon}</span>
					<span className="text-xs font-semibold uppercase tracking-[0.2em]">
						{phase.label}
					</span>
				</Button>
			);
		});

		const turnIndicator = (
			<div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
				<span>Turn {ctx.game.turn}</span>
				<span className="rounded-full bg-white/60 px-2 py-1 text-[0.65rem] font-medium tracking-[0.2em] text-slate-500 dark:bg-white/10 dark:text-slate-300">
					{ctx.activePlayer.name}
				</span>
			</div>
		);

		const renderedPhaseSteps = phaseSteps.map((stepEntry, stepIndex) => {
			const stepBaseClasses = [
				'rounded-2xl border px-4 py-3 shadow-sm transition-all',
			];
			const stepStateClasses = stepEntry.active
				? [
						'border-blue-500/50',
						'bg-gradient-to-r from-blue-500/20 to-indigo-500/20',
						'text-slate-800 shadow-blue-500/30',
						'dark:border-indigo-400/40',
						'dark:from-blue-500/30 dark:to-indigo-500/30',
						'dark:text-slate-50',
					]
				: [
						'border-white/40 bg-white/60 text-slate-600',
						'dark:border-white/10 dark:bg-slate-900/40',
						'dark:text-slate-200',
					];
			const stepClassSegments = [...stepBaseClasses, ...stepStateClasses];
			const stepClasses = stepClassSegments.join(' ');
			const titleClasses = [
				'text-sm font-semibold',
				stepEntry.active
					? 'text-slate-900 dark:text-white'
					: 'text-slate-700 dark:text-slate-100',
			].join(' ');
			const itemClassName = (item: PhaseStep['items'][number]) =>
				[
					item.italic ? 'italic' : '',
					item.done
						? 'font-semibold text-emerald-600 dark:text-emerald-400'
						: '',
				]
					.filter(Boolean)
					.join(' ');
			const stepItems = stepEntry.items.length ? (
				stepEntry.items.map((item, itemIndex) => (
					<li key={itemIndex} className={itemClassName(item)}>
						{item.text}
						{item.done && <span className="ml-1">✔️</span>}
					</li>
				))
			) : (
				<li className="italic text-slate-400 dark:text-slate-500">...</li>
			);
			return (
				<li key={stepIndex} className={stepClasses}>
					<div className={titleClasses}>{stepEntry.title}</div>
					<ul
						className={[
							'mt-2 space-y-1 pl-4 text-[0.85rem] leading-snug',
							'list-disc list-inside',
							stepEntry.active
								? 'text-slate-700 dark:text-slate-100'
								: 'text-slate-600 dark:text-slate-300',
						].join(' ')}
					>
						{stepItems}
					</ul>
				</li>
			);
		});

		const actionPhaseHasActiveSteps =
			actionPhaseId &&
			phaseHistories[actionPhaseId]?.some(
				(stepHistoryEntry) => stepHistoryEntry.active,
			);
		const shouldDisableEndTurn = Boolean(actionPhaseHasActiveSteps);
		const timerCircle = <TimerCircle progress={phaseTimer} />;
		const handleEndTurnClick = () => {
			void handleEndTurn();
		};
		const endTurnButton = (
			<Button
				variant="primary"
				disabled={shouldDisableEndTurn}
				onClick={handleEndTurnClick}
			>
				Next Turn
			</Button>
		);

		const panelHeight = Math.max(320, height ?? 0);

		return (
			<section
				ref={ref}
				className="relative flex min-h-[320px] w-full flex-col gap-3 overflow-hidden rounded-3xl border border-white/60 bg-white/75 px-6 py-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/50 frosted-surface"
				style={{ height: `${panelHeight}px` }}
			>
				<div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/40 pb-2 dark:border-white/10">
					{turnIndicator}
					<div className="flex flex-wrap gap-2">{phaseTabs}</div>
				</div>
				<ul
					ref={phaseStepsRef}
					className="flex-1 space-y-3 overflow-y-auto text-left text-sm custom-scrollbar"
				>
					{renderedPhaseSteps}
				</ul>
				{(!isActionPhase || phaseTimer > 0) && (
					<div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
						<div className="h-9 w-9">{timerCircle}</div>
					</div>
				)}
				{isActionPhase && (
					<div className="mt-2 text-right">{endTurnButton}</div>
				)}
			</section>
		);
	},
);

export default PhasePanel;
