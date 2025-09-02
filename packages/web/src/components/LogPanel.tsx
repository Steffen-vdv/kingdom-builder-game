import React, { useEffect, useRef } from 'react';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';

export default function LogPanel() {
  const { log: entries, ctx } = useGameEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useAnimate<HTMLUListElement>();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight)
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
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
          const isLast = idx === entries.length - 1;
          return (
            <li
              key={idx}
              className={`flex items-start gap-2 text-sm whitespace-pre-wrap ${colorClass} ${
                isLast
                  ? 'font-semibold bg-black/5 dark:bg-white/10 rounded'
                  : ''
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current mt-1 flex-shrink-0" />
              <span>
                <span className="font-mono tabular-nums">[{entry.time}]</span>{' '}
                {entry.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
