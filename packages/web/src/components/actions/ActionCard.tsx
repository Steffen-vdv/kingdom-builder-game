import React from 'react';
import { type Summary } from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';

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
  summary?: Summary | undefined;
  implemented?: boolean;
  enabled: boolean;
  tooltip?: string | undefined;
  requirements?: string[];
  requirementIcons?: string[];
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export default function ActionCard({
  title,
  costs,
  playerResources,
  actionCostResource,
  summary,
  implemented = true,
  enabled,
  tooltip,
  requirements = [],
  requirementIcons = [],
  onClick,
  onKeyDown,
  onMouseEnter,
  onMouseLeave,
}: ActionCardProps) {
  return (
    <button
      className={`relative panel-card border border-black/10 dark:border-white/10 p-2 flex flex-col items-start gap-1 h-full shadow-sm ${
        enabled ? 'hoverable cursor-pointer' : 'opacity-50 cursor-not-allowed'
      }`}
      title={tooltip}
      onClick={enabled ? onClick : undefined}
      onKeyDown={enabled ? onKeyDown : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="text-base font-medium">{title}</span>
      <span className="absolute top-2 right-2 text-sm text-gray-600 dark:text-gray-300">
        {renderCosts(costs, playerResources, actionCostResource)}
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
