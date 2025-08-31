import type { Summary, SummaryEntry } from './types';

export function splitSummary(summary: Summary | undefined): {
  effects: Summary;
  description: Summary;
} {
  const effects: Summary = [];
  const description: Summary = [];
  if (!summary) return { effects, description };
  for (const entry of summary) {
    if (typeof entry === 'string') {
      effects.push(entry);
      continue;
    }
    const { _desc, _hoist, items, ...rest } = entry as Record<
      string,
      unknown
    > & {
      items: Summary;
    };
    const inner = splitSummary(items);
    const newEntry: SummaryEntry = {
      ...(rest as { title: string }),
      items: inner.effects,
    };
    if (inner.description.length > 0) {
      (newEntry as { items: SummaryEntry[] }).items.push({
        title: 'Description',
        items: inner.description,
      });
    }
    if (_desc) {
      description.push(newEntry);
    } else {
      effects.push(newEntry);
    }
  }
  return { effects, description };
}
