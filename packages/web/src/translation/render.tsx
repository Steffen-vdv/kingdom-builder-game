import React from 'react';
import { Resource } from '@kingdom-builder/engine';
import { RESOURCES } from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/engine';
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
  costs: Record<string, number> | undefined,
  resources: Record<string, number>,
) {
  if (!costs) return null;
  const entries = Object.entries(costs).filter(([k]) => k !== Resource.ap);
  if (entries.length === 0)
    return (
      <span className="mr-1 text-gray-400 dark:text-gray-500 italic">Free</span>
    );
  return (
    <>
      {entries.map(([k, v]) => (
        <span
          key={k}
          className={`mr-1 ${(resources[k] ?? 0) < v ? 'text-red-500' : ''}`}
        >
          {RESOURCES[k as ResourceKey]?.icon}
          {v}
        </span>
      ))}
    </>
  );
}
