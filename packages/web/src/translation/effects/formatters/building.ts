import { registerEffectFormatter } from '../factory';
import { resolveBuildingDisplay } from '../../content/buildingIcons';
import { describeContent, summarizeContent } from '../../content';
import type { SummaryEntry } from '../../content';

function summarizeBuilding(
	id: string | undefined,
	context: Parameters<typeof summarizeContent>[2],
): SummaryEntry[] {
	if (!id) {
		return [];
	}
	try {
		return summarizeContent('building', id, context);
	} catch {
		return [];
	}
}

function describeBuilding(
	id: string | undefined,
	context: Parameters<typeof describeContent>[2],
): SummaryEntry[] {
	if (!id) {
		return [];
	}
	try {
		return describeContent('building', id, context);
	} catch {
		return [];
	}
}

function resolveBuildingLabel(
	id: string | undefined,
	context: Parameters<typeof summarizeContent>[2],
): string {
	const { name, icon } =
		typeof id === 'string'
			? resolveBuildingDisplay(id, context)
			: { name: '', icon: '' };
	const label = [icon, name].filter(Boolean).join(' ').trim();
	if (label.length > 0) {
		return label;
	}
	if (typeof id === 'string' && id.length > 0) {
		return id;
	}
	return 'Building';
}

registerEffectFormatter('building', 'add', {
	summarize: (effect, context) => {
		const id = effect.params?.['id'] as string | undefined;
		const label = resolveBuildingLabel(id, context);
		const items = summarizeBuilding(id, context);
		if (items.length === 0) {
			return label;
		}
		return [
			{
				title: label,
				items,
				_hoist: true,
			},
		];
	},
	describe: (effect, context) => {
		const id = effect.params?.['id'] as string | undefined;
		const label = resolveBuildingLabel(id, context);
		const items = describeBuilding(id, context);
		const title = `Construct ${label}`.trim();
		if (items.length === 0) {
			return title;
		}
		return [
			{
				title,
				items,
				_desc: true,
			},
		];
	},
});
