import React, { useEffect, useRef } from 'react';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';

export default function LogPanel() {
  const { log: entries, ctx } = useGameEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useAnimate<HTMLUListElement>();

  useEffect(() => {
    const container = containerRef.current;
    const list = listRef.current;
    if (!container || !list) return;

    const scrollToBottom = (behavior: ScrollBehavior) => {
      if (container.scrollHeight > container.clientHeight)
        container.scrollTo({ top: container.scrollHeight, behavior });
    };

    const animations =
      typeof list.getAnimations === 'function' ? list.getAnimations() : [];
    if (animations.length === 0) {
      scrollToBottom('smooth');
      return;
    }

    let cancelled = false;
    const finished = animations.map((animation) =>
      animation.finished.catch(() => undefined),
    );

    void Promise.all(finished).then(() => {
      if (!cancelled) scrollToBottom('smooth');
    });

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
