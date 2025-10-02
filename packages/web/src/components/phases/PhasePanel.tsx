import React, { useEffect, useMemo } from 'react';
import TimerCircle from '../TimerCircle';
import { useGameEngine } from '../../state/GameContext';
import { isActionPhaseActive } from '../../utils/isActionPhaseActive';
import { useAnimate } from '../../utils/useAutoAnimate';
import Button from '../common/Button';

const PhasePanel = React.forwardRef<HTMLDivElement>((_, ref) => {
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

	const actionPhaseId = useMemo(
		() => ctx.phases.find((p) => p.action)?.id,
		[ctx],
	);
	const isActionPhase = isActionPhaseActive(
		ctx.game.currentPhase,
		actionPhaseId,
		tabsEnabled,
	);

	const phaseStepsRef = useAnimate<HTMLUListElement>();

	useEffect(() => {
		const el = phaseStepsRef.current;
		if (!el) return;
		el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
	}, [phaseSteps]);

	return (
		<section
			ref={ref}
			className="relative flex h-[320px] w-full flex-col gap-3 overflow-hidden rounded-3xl border border-white/60 bg-white/75 px-6 py-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-slate-900/50 frosted-surface"
		>
			<div className="absolute -top-6 left-4 rounded-full border border-white/60 bg-white/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200 frosted-surface">
				<span>
					Turn {ctx.game.turn} · {ctx.activePlayer.name}
				</span>
			</div>
			<div className="flex flex-wrap gap-2 border-b border-white/40 pb-2 dark:border-white/10">
				{ctx.phases.map((p) => {
					const isSelected = displayPhase === p.id;
					const tabClasses = [
						'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all',
						isSelected
							? 'bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white shadow-lg shadow-blue-500/30'
							: 'text-slate-600 hover:bg-white/60 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100',
						tabsEnabled ? '' : 'opacity-60',
					]
						.filter(Boolean)
						.join(' ');
					return (
						<Button
							key={p.id}
							type="button"
							disabled={!tabsEnabled}
							onClick={() => {
								if (!tabsEnabled) return;
								setDisplayPhase(p.id);
								setPhaseSteps(phaseHistories[p.id] ?? []);
							}}
							variant="ghost"
							className={tabClasses}
						>
							<span className="text-lg leading-none">{p.icon}</span>
							<span className="text-xs font-semibold uppercase tracking-[0.2em]">
								{p.label}
							</span>
						</Button>
					);
				})}
			</div>
			<ul
				ref={phaseStepsRef}
				className="flex-1 space-y-3 overflow-y-auto text-left text-sm custom-scrollbar"
			>
				{phaseSteps.map((s, i) => {
					const stepClasses = [
						'rounded-2xl border px-4 py-3 shadow-sm transition-all',
						s.active
							? 'border-blue-500/50 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-slate-800 shadow-blue-500/30 dark:border-indigo-400/40 dark:from-blue-500/30 dark:to-indigo-500/30 dark:text-slate-50'
							: 'border-white/40 bg-white/60 text-slate-600 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200',
					]
						.filter(Boolean)
						.join(' ');
					const titleClasses = [
						'text-sm font-semibold',
						s.active
							? 'text-slate-900 dark:text-white'
							: 'text-slate-700 dark:text-slate-100',
					]
						.filter(Boolean)
						.join(' ');
					return (
						<li key={i} className={stepClasses}>
							<div className={titleClasses}>{s.title}</div>
							<ul
								className={[
									'mt-2 space-y-1 pl-4 text-[0.85rem] leading-snug list-disc list-inside',
									s.active
										? 'text-slate-700 dark:text-slate-100'
										: 'text-slate-600 dark:text-slate-300',
								]
									.filter(Boolean)
									.join(' ')}
							>
								{s.items.length > 0 ? (
									s.items.map((it, j) => (
										<li
											key={j}
											className={[
												it.italic ? 'italic' : '',
												it.done
													? 'font-semibold text-emerald-600 dark:text-emerald-400'
													: '',
											]
												.filter(Boolean)
												.join(' ')}
										>
											{it.text}
											{it.done && <span className="ml-1">✔️</span>}
										</li>
									))
								) : (
									<li className="italic text-slate-400 dark:text-slate-500">
										...
									</li>
								)}
							</ul>
						</li>
					);
				})}
			</ul>
			{(!isActionPhase || phaseTimer > 0) && (
				<div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-slate-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
					<div className="h-9 w-9">
						<TimerCircle progress={phaseTimer} />
					</div>
				</div>
			)}
			{isActionPhase && (
				<div className="mt-2 text-right">
					<Button
						variant="primary"
						disabled={Boolean(
							actionPhaseId &&
								phaseHistories[actionPhaseId]?.some((s) => s.active),
						)}
						onClick={() => void handleEndTurn()}
					>
						Next Turn
					</Button>
				</div>
			)}
		</section>
	);
});

export default PhasePanel;
