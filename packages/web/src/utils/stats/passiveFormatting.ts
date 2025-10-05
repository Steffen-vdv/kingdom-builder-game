import {
	PASSIVE_INFO,
	PhaseStepId,
	formatPassiveRemoval,
} from '@kingdom-builder/contents';
import type { StatSourceLink, StatSourceMeta } from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../translation/content/types';
import { formatLinkLabel } from './dependencyFormatters';

const PERMANENT_ICON = '🗿';

export function buildLongevityEntries(
	meta: StatSourceMeta,
	dependencies: string[],
	removal?: string,
	removalLink?: StatSourceLink,
): SummaryEntry[] {
	if (meta.longevity === 'ongoing') {
		const anchors = collectAnchorLabels(meta);
		const condition = formatInPlayCondition(anchors);
		if (condition) {
			return [`${PASSIVE_INFO.icon ?? '♾️'} Ongoing as long as ${condition}`];
		}
		return [`${PASSIVE_INFO.icon ?? '♾️'} Ongoing`];
	}
	const entries: SummaryEntry[] = [];
	const items: SummaryEntry[] = [];
	if (dependencies.length && shouldDisplayPermanentDependencies(meta)) {
		dependencies.forEach((link) => {
			items.push(`Triggered by ${link}`);
		});
	}
	const removalCondition = formatInPlayCondition(
		collectRemovalLabels(removalLink),
	);
	if (removalCondition) {
		entries.push(formatPassiveRemoval(removalCondition));
	} else if (removal) {
		entries.push(formatPassiveRemoval(removal));
	}
	entries.unshift(`${PERMANENT_ICON} Permanent`);
	return entries.concat(items);
}

function shouldDisplayPermanentDependencies(meta: StatSourceMeta): boolean {
	if (meta.kind === 'phase') {
		const detail = meta.detail?.trim().toLowerCase();
		if (detail === PhaseStepId.RaiseStrength) {
			return false;
		}
	}
	return true;
}

function collectAnchorLabels(meta: StatSourceMeta): string[] {
	const labels: string[] = [];
	const seen = new Set<string>();
	const add = (label?: string) => {
		if (!label) {
			return;
		}
		const normalized = label.replace(/\s+/g, ' ').trim().toLowerCase();
		if (!normalized || seen.has(normalized)) {
			return;
		}
		seen.add(normalized);
		labels.push(label.trim());
	};
	const includeLink = (link?: StatSourceLink) => {
		if (!link || link.type === 'action') {
			return;
		}
		add(formatLinkLabel(link));
	};
	includeLink(meta.removal);
	if (meta.dependsOn) {
		meta.dependsOn.forEach((link) => includeLink(link));
	}
	if (meta.kind && meta.id && meta.kind !== 'action') {
		includeLink({ type: meta.kind, id: meta.id });
	}
	return labels;
}

function collectRemovalLabels(removal?: StatSourceLink): string[] {
	if (!removal) {
		return [];
	}
	const label = formatLinkLabel(removal);
	return label ? [label] : [];
}

function joinWithAnd(values: string[]): string {
	if (values.length <= 1) {
		return values[0] ?? '';
	}
	if (values.length === 2) {
		return `${values[0]!} and ${values[1]!}`;
	}
	const head = values.slice(0, -1).join(', ');
	const tail = values[values.length - 1];
	return `${head}, and ${tail}`;
}

function formatInPlayCondition(labels: string[]): string | undefined {
	if (!labels.length) {
		return undefined;
	}
	const joined = joinWithAnd(labels);
	const verb = labels.length > 1 ? 'are' : 'is';
	return `${joined} ${verb} in play`;
}
