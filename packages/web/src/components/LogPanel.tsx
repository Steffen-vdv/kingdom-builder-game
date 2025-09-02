import React, { useEffect, useRef, useState } from 'react';
import { useGameEngine } from '../state/GameContext';
import { useAnimate } from '../utils/useAutoAnimate';
import Button from './common/Button';

export default function LogPanel() {
  const { log: entries, ctx } = useGameEngine();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useAnimate<HTMLUListElement>();
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 5;
      setAutoScroll(atBottom);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !autoScroll) return;
    if (el.scrollHeight > el.clientHeight)
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [entries, autoScroll]);

  return (
    <div className="relative">
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
      {!autoScroll && (
        <Button
          variant="primary"
          className="absolute bottom-2 right-2"
          onClick={() => {
            const el = containerRef.current;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
            setAutoScroll(true);
          }}
        >
          Jump to bottom
        </Button>
      )}
    </div>
  );
}
