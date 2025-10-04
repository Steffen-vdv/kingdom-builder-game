import type { Summary, SummaryEntry } from './types';

export function splitSummary(summary: Summary | undefined): {
	effects: Summary;
	description?: Summary;
} {
	const effects: Summary = [];
	let description: Summary | undefined;
	if (!summary) {
		return { effects };
	}
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
		if (inner.description?.length) {
			(newEntry as { items: SummaryEntry[] }).items.push({
				title: 'Description',
				items: inner.description,
			});
		}
		if (_desc) {
			(description ||= []).push(newEntry);
		} else {
			effects.push(newEntry);
		}
	}
	return description ? { effects, description } : { effects };
}
