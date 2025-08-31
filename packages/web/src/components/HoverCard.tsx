import React from 'react';
import { renderSummary, renderCosts } from '../translation/render';
import { useGameEngine } from '../state/GameContext';

export default function HoverCard() {
  const { hoverCard: data, clearHoverCard, ctx } = useGameEngine();
  if (!data) return null;
  return (
    <div
      className={`border rounded p-4 shadow relative pointer-events-none w-full ${
        data.bgClass || 'bg-white dark:bg-gray-800'
      }`}
      onMouseLeave={clearHoverCard}
    >
      <div className="font-semibold mb-2">
        {data.title}
        <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
          {renderCosts(data.costs, ctx.activePlayer.resources)}
        </span>
      </div>
      {data.description && (
        <div className={`mb-2 text-sm ${data.descriptionClass ?? ''}`}>
          {data.description}
        </div>
      )}
      {data.effects.length > 0 && (
        <div className="mb-2">
          <div className="font-semibold">{data.effectsTitle ?? 'Effects'}</div>
          <ul className="list-disc pl-4 text-sm">
            {renderSummary(data.effects)}
          </ul>
        </div>
      )}
      {data.requirements.length > 0 && (
        <div className="text-sm text-red-600 mt-2">
          <div className="font-semibold text-red-600">Requirements</div>
          <ul className="list-disc pl-4">
            {data.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
