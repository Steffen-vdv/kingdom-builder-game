import React from 'react';
import { type Summary } from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';
import type { Focus } from '@kingdom-builder/contents';

function stripSummary(summary: Summary | undefined): Summary | undefined {
  const first = summary?.[0];
  if (!first) return summary;
  return typeof first === 'string' ? summary : first.items;
}

export type ActionCardProps = {
  title: React.ReactNode;
  costs: Record<string, number>;
  playerResources: Record<string, number>;
  actionCostResource: string;
  upkeep?: Record<string, number> | undefined;
  summary?: Summary | undefined;
  implemented?: boolean;
  enabled: boolean;
  tooltip?: string | undefined;
  requirements?: string[];
  requirementIcons?: string[];
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  focus?: Focus | undefined;
};

export default function ActionCard({
  title,
  costs,
  playerResources,
  actionCostResource,
  upkeep,
  summary,
  implemented = true,
  enabled,
  tooltip,
  requirements = [],
  requirementIcons = [],
  onClick,
  onMouseEnter,
  onMouseLeave,
  focus,
}: ActionCardProps) {
  const focusClass = (() => {
    switch (focus) {
      case 'economy':
        return 'bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-900/60';
      case 'aggressive':
        return 'bg-orange-100 dark:bg-orange-900/40 hover:bg-orange-200 dark:hover:bg-orange-900/60';
      case 'defense':
        return 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60';
    }
  })();
  return (
    <button
      className={`relative panel-card border border-black/10 dark:border-white/10 p-2 flex flex-col items-start gap-1 h-full shadow-sm ${
        enabled ? 'hoverable cursor-pointer' : 'opacity-50 cursor-not-allowed'
      } ${focusClass}`}
      title={tooltip}
      onClick={enabled ? onClick : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="text-base font-medium">{title}</span>
      <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
        {renderCosts(costs, playerResources, actionCostResource, upkeep)}
      </span>
      {requirements.length > 0 && requirementIcons.length > 0 && (
        <span className="absolute top-7 right-2 text-xs text-red-600">
          Req {requirementIcons.join('')}
        </span>
      )}
      <ul className="text-sm list-disc pl-4 text-left">
        {implemented ? (
          renderSummary(stripSummary(summary))
        ) : (
          <li className="italic text-red-600">Not implemented yet</li>
        )}
      </ul>
    </button>
  );
}
