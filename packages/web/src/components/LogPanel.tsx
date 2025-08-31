import React, { useEffect, useRef } from 'react';
import { useGameEngine } from '../state/GameContext';

export default function LogPanel() {
  const { log: entries, ctx } = useGameEngine();
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight)
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries]);

  return (
    <div
      ref={logRef}
      className="border rounded p-4 overflow-y-auto max-h-80 bg-white dark:bg-gray-800 shadow w-full"
    >
      <h2 className="text-xl font-semibold mb-2">Log</h2>
      <ul className="mt-2 space-y-1">
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
              className={`text-xs font-mono whitespace-pre-wrap rounded px-1 ${colorClass}`}
            >
              [{entry.time}] {entry.text}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
