import { PASSIVE_INFO } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { summarizeContent, splitSummary } from '../../translation';

export const MAX_TIER_SUMMARY_LINES = 4;

export type TierDefinition =
	EngineContext['services']['rules']['tierDefinitions'][number];

type TierSummaryEntry = TierDefinition & { active: boolean };

function formatTierRange(tier: TierDefinition) {
	const { min, max } = tier.range;
	if (max === undefined) {
		return `${min}`;
	}
	if (min === max) {
		return `${min}`;
	}
	return `${min} to ${max}`;
}

export function buildTierEntries(
	tiers: TierDefinition[],
	activeId: string | undefined,
	ctx: EngineContext,
) {
	const getRangeStart = (tier: TierDefinition) =>
		tier.range.min ?? Number.NEGATIVE_INFINITY;
	const orderedTiers = [...tiers].sort(
		(a, b) => getRangeStart(b) - getRangeStart(a),
	);
	const entries: TierSummaryEntry[] = orderedTiers.map((tier) => ({
		...tier,
		active: tier.id === activeId,
	}));
	return entries.map((entry) => {
		const { display, active } = entry;
		const rangeLabel = formatTierRange(entry);
		const statusIcon = active ? '🟢' : '⚪';
		const icon = display?.icon ?? PASSIVE_INFO.icon ?? '';
		const titleParts = [statusIcon, icon, rangeLabel].filter(
			(part) => part && String(part).trim().length > 0,
		);
		const title = titleParts.join(' ').trim();

		const summary = summarizeContent('tier', entry, ctx);
		const { effects } = splitSummary(summary);
		const items = effects.slice(0, MAX_TIER_SUMMARY_LINES);
		return { title, items };
	});
}
