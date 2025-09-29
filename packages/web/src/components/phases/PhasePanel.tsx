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
    phasePaused,
    setPaused,
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
      className="border rounded p-4 bg-white dark:bg-gray-800 shadow relative w-full flex flex-col h-full min-h-[275px]"
      onMouseEnter={() => !isActionPhase && setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{
        cursor:
          phasePaused && !isActionPhase
            ? 'url("/pause-cursor.svg"), wait'
            : 'auto',
      }}
    >
      <div className="absolute -top-6 left-0 font-semibold">
        Turn {ctx.game.turn} - {ctx.activePlayer.name}
      </div>
      <div className="flex mb-2 border-b border-gray-200 dark:border-gray-700">
        {ctx.phases.map((p) => {
          const isSelected = displayPhase === p.id;
          const tabClasses = [
            'text-sm relative flex items-center gap-1 rounded-none px-3 py-1 transition-shadow hover:scale-100',
            isSelected
              ? 'font-semibold text-gray-900 dark:text-gray-100 shadow-[inset_0_-2px_0_rgba(59,130,246,0.95)] dark:shadow-[inset_0_-2px_0_rgba(96,165,250,0.9)]'
              : 'text-gray-500 shadow-[inset_0_-2px_0_rgba(0,0,0,0)] dark:shadow-[inset_0_-2px_0_rgba(0,0,0,0)]',
            tabsEnabled ? 'hover:text-gray-800 dark:hover:text-gray-200' : '',
            !isSelected && tabsEnabled
              ? 'hover:shadow-[inset_0_-2px_0_rgba(96,165,250,0.75)] dark:hover:shadow-[inset_0_-2px_0_rgba(147,197,253,0.75)]'
              : '',
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
              {p.icon} {p.label}
            </Button>
          );
        })}
      </div>
      <ul
        ref={phaseStepsRef}
        className="text-sm text-left space-y-1 overflow-hidden flex-1"
      >
        {phaseSteps.map((s, i) => (
          <li key={i} className={s.active ? 'font-semibold' : ''}>
            <div>{s.title}</div>
            <ul className="pl-4 list-disc list-inside">
              {s.items.length > 0 ? (
                s.items.map((it, j) => (
                  <li key={j} className={it.italic ? 'italic' : ''}>
                    {it.text}
                    {it.done && <span className="text-green-600 ml-1">✔️</span>}
                  </li>
                ))
              ) : (
                <li>...</li>
              )}
            </ul>
          </li>
        ))}
      </ul>
      {(!isActionPhase || phaseTimer > 0) && (
        <div className="absolute top-2 right-2">
          <TimerCircle progress={phaseTimer} paused={phasePaused} />
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
