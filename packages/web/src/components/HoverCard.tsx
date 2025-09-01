import React from 'react';
import { renderSummary, renderCosts } from '../translation/render';
import { useGameEngine } from '../state/GameContext';

export default function HoverCard() {
  const {
    hoverCard: data,
    clearHoverCard,
    hoverPinned,
    ctx,
    actionCostResource,
  } = useGameEngine();
  if (!data) return null;
  return (
    <div
      className={`border rounded p-4 shadow relative w-full ${
        hoverPinned ? '' : 'pointer-events-none'
      } ${data.bgClass || 'bg-white dark:bg-gray-800'}`}
      onMouseLeave={hoverPinned ? undefined : () => clearHoverCard()}
    >
      {hoverPinned && (
        <button
          className="absolute top-1 right-1 text-xs text-gray-600 dark:text-gray-300"
          onClick={() => clearHoverCard(true)}
          aria-label="Close"
        >
          ×
        </button>
      )}
      <div className="font-semibold mb-2">
        {data.title}
        <span className="absolute top-2 right-6 text-sm text-gray-600 dark:text-gray-300">
          {renderCosts(
            data.costs,
            ctx.activePlayer.resources,
            actionCostResource,
          )}
        </span>
      </div>
      {data.effects.length > 0 && (
        <div className="mb-2">
          <div className="font-semibold">{data.effectsTitle ?? 'Effects'}</div>
          <ul className="list-disc pl-4 text-sm">
            {renderSummary(data.effects)}
          </ul>
        </div>
      )}
      {(() => {
        const desc = data.description;
        const hasDescription =
          typeof desc === 'string'
            ? desc.trim().length > 0
            : Array.isArray(desc) && desc.length > 0;
        if (!hasDescription) return null;
        return (
          <div className="mt-2">
            <div className={`font-semibold ${data.descriptionClass ?? ''}`}>
              {data.descriptionTitle ?? 'Description'}
            </div>
            {typeof desc === 'string' ? (
              <div className={`text-sm ${data.descriptionClass ?? ''}`}>
                {desc}
              </div>
            ) : (
              <ul className="list-disc pl-4 text-sm">{renderSummary(desc)}</ul>
            )}
          </div>
        );
      })()}
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
