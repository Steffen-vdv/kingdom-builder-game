import React from 'react';
import { type Summary } from '../../translation';
import { renderSummary, renderCosts } from '../../translation/render';
import type { Focus } from '@kingdom-builder/contents';

function stripSummary(
  summary: Summary | undefined,
  requirements: readonly string[],
): Summary | undefined {
  const first = summary?.[0];
  const baseSummary = !first
    ? summary
    : typeof first === 'string'
      ? summary
      : first.items;
  if (!baseSummary) return baseSummary;
  if (requirements.length === 0) return baseSummary;
  const requirementSet = new Set(
    requirements.map((req) => req.trim()).filter((req) => req.length > 0),
  );
  const filterEntries = (entries: Summary): Summary => {
    const filtered: Summary = [];
    for (const entry of entries) {
      if (typeof entry === 'string') {
        if (requirementSet.has(entry.trim())) continue;
        filtered.push(entry);
      } else {
        const nested = filterEntries(entry.items);
        if (nested.length > 0) {
          filtered.push({ ...entry, items: nested });
        }
      }
    }
    return filtered;
  };
  const filtered = filterEntries(baseSummary);
  return filtered.length > 0 ? filtered : undefined;
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
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 text-right">
        {renderCosts(costs, playerResources, actionCostResource, upkeep)}
        {requirements.length > 0 && (
          <div className="flex flex-col items-end gap-0.5 text-xs text-red-600">
            <div className="whitespace-nowrap">
              Req
              {requirementIcons.length > 0 && ` ${requirementIcons.join('')}`}
            </div>
          </div>
        )}
      </div>
      <ul className="text-sm list-disc pl-4 text-left">
        {implemented ? (
          renderSummary(stripSummary(summary, requirements))
        ) : (
          <li className="italic text-red-600">Not implemented yet</li>
        )}
      </ul>
    </button>
  );
}
