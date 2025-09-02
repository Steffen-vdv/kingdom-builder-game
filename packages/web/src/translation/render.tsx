import React from 'react';
import { RESOURCES, BROOM_ICON } from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
import type { Summary } from './content';

export function renderSummary(summary: Summary | undefined): React.ReactNode {
  return summary?.map((e, i) =>
    typeof e === 'string' ? (
      <li key={i} className="whitespace-pre-line">
        {e}
      </li>
    ) : (
      <li key={i}>
        <span className="font-semibold">{e.title}</span>
        <ul className="list-disc pl-4">{renderSummary(e.items)}</ul>
      </li>
    ),
  );
}

export function renderCosts(
  costs: Record<string, number | undefined> | undefined,
  resources: Record<string, number>,
  actionCostResource?: string,
  upkeep?: Record<string, number | undefined> | undefined,
) {
  const entries = Object.entries(costs || {}).filter(
    ([k]) => !actionCostResource || k !== actionCostResource,
  );
  const upkeepEntries = Object.entries(upkeep || {});
  if (entries.length === 0 && upkeepEntries.length === 0)
    return (
      <span className="mr-1 text-gray-400 dark:text-gray-500 italic">Free</span>
    );
  return (
    <>
      {entries.map(([k, v]) => (
        <span
          key={k}
          className={`mr-1 ${(resources[k] ?? 0) < (v ?? 0) ? 'text-red-500' : ''}`}
        >
          {RESOURCES[k as ResourceKey]?.icon}
          {v ?? 0}
        </span>
      ))}
      {upkeepEntries.length > 0 && (
        <span className="block text-xs text-gray-600 dark:text-gray-300">
          {BROOM_ICON}{' '}
          {upkeepEntries
            .map(([k, v]) => `${RESOURCES[k as ResourceKey]?.icon}${v ?? 0}`)
            .join(' ')}
        </span>
      )}
    </>
  );
}
