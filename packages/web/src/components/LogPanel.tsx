import React, { useEffect, useRef } from 'react';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';

export default function LogPanel() {
  const { log: entries, ctx } = useGameEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useAnimate<HTMLUListElement>();
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateShouldScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom <= 4;
    };

    updateShouldScroll();
    container.addEventListener('scroll', updateShouldScroll);
    return () => container.removeEventListener('scroll', updateShouldScroll);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const list = listRef.current;

    if (!container || !list) return;
    if (!shouldAutoScrollRef.current) return;

    const scrollToBottom = (behavior: ScrollBehavior) => {
      container.scrollTo({ top: container.scrollHeight, behavior });
    };

    scrollToBottom('smooth');

    const getAnimations = () => {
      if (typeof list.getAnimations !== 'function') return [] as Animation[];
      try {
        return list.getAnimations({ subtree: true });
      } catch {
        return list.getAnimations();
      }
    };

    const animations = getAnimations();
    if (!animations.length) return;

    let cancelled = false;

    const handleAnimationsComplete = () => {
      if (!cancelled) scrollToBottom('smooth');
    };

    const animationCompletion = Promise.all(
      animations.map((animation) => animation.finished.catch(() => undefined)),
    ).then(handleAnimationsComplete);

    void animationCompletion;

    return () => {
      cancelled = true;
    };
  }, [entries]);

  return (
    <div
      ref={containerRef}
      className="border rounded p-4 overflow-y-auto max-h-80 bg-white dark:bg-gray-800 shadow w-full"
    >
      <h2 className="text-xl font-semibold mb-2">Log</h2>
      <ul ref={listRef} className="mt-2 space-y-1">
        {entries.map((entry, idx) => {
          const aId = ctx.game.players[0]?.id;
          const bId = ctx.game.players[1]?.id;
          const colorClass =
            entry.playerId === aId
              ? 'log-entry-a'
              : entry.playerId === bId
                ? 'log-entry-b'
                : '';
          return (
            <li
              key={idx}
              className={`text-xs font-mono whitespace-pre-wrap ${colorClass}`}
            >
              [{entry.time}] {entry.text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
