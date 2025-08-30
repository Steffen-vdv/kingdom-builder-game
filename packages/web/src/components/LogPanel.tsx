import React, { useEffect, useRef } from 'react';
import { useGameEngine } from '../state/GameContext';

export default function LogPanel() {
  const { log: entries } = useGameEngine();
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
        {entries.map((entry, idx) => (
          <li key={idx} className="text-xs font-mono whitespace-pre-wrap">
            [{entry.time}] {entry.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
