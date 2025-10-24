import { resolvePassivePresentation } from './passives';
import type { ActionDiffChange } from './diff';
import type { PlayerSnapshot } from './snapshots';
import {
	createPassiveVisibilityContext,
	shouldSurfacePassive,
} from '../../passives/visibility';
import type { TranslationAssets } from '../context';

function createPassiveMap(passives: PlayerSnapshot['passives']) {
	const map = new Map<string, PlayerSnapshot['passives'][number]>();
	for (const passive of passives) {
		map.set(passive.id, passive);
	}
	return map;
}

function decoratePassiveLabel(
	icon: string,
	label: string,
	assets: TranslationAssets,
): string {
	const fallback = label.trim() || assets.passive.label || label;
	const decorated = [icon, fallback]
		.filter((part) => part && String(part).trim().length > 0)
		.join(' ')
		.trim();
	const prefix = assets.passive.icon?.trim();
	if (!prefix) {
		return decorated;
	}
	return decorated.length ? `${prefix} ${decorated}` : prefix;
}

interface PassiveChangeOptions {
	resourceNodes?: Map<string, ActionDiffChange>;
	tieredResourceId?: string;
	existingSummaries?: Set<string>;
}

export function appendPassiveChanges(
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	assets: TranslationAssets,
	options?: PassiveChangeOptions,
): ActionDiffChange[] {
	const rootNodes: ActionDiffChange[] = [];
	const previous = createPassiveMap(before.passives);
	const next = createPassiveMap(after.passives);
	const previousContext = createPassiveVisibilityContext(before);
	const nextContext = createPassiveVisibilityContext(after);
	const existingSummaries = options?.existingSummaries ?? new Set<string>();

	function addPassiveChange(
		passive: PlayerSnapshot['passives'][number],
		context: ReturnType<typeof createPassiveVisibilityContext>,
		status: 'activated' | 'deactivated',
	) {
		if (!shouldSurfacePassive(passive, context, 'log')) {
			return;
		}
		const { icon, label } = resolvePassivePresentation(passive, {
			assets,
		});
		const decoratedLabel = decoratePassiveLabel(icon, label, assets);
		const entry = `${decoratedLabel} ${status}`;
		if (existingSummaries.has(entry)) {
			return;
		}
		const node: ActionDiffChange = { summary: entry };
		const sourceType = passive.meta?.source?.type?.trim();
		if (
			sourceType === 'tiered-resource' &&
			options?.tieredResourceId &&
			options.resourceNodes?.has(options.tieredResourceId)
		) {
			const parent = options.resourceNodes.get(options.tieredResourceId);
			if (parent) {
				if (!parent.children) {
					parent.children = [];
				}
				const alreadyAdded = parent.children.some((child) => {
					return child.summary === entry;
				});
				if (!alreadyAdded) {
					parent.children.push(node);
					existingSummaries.add(entry);
				}
				return;
			}
		}
		existingSummaries.add(entry);
		rootNodes.push(node);
	}

	for (const [id, passive] of next) {
		if (previous.has(id)) {
			continue;
		}
		const sourceType = passive.meta?.source?.type;
		if (!sourceType || sourceType.trim().length === 0) {
			continue;
		}
		addPassiveChange(passive, nextContext, 'activated');
	}
	for (const [id, passive] of previous) {
		if (next.has(id)) {
			continue;
		}
		addPassiveChange(passive, previousContext, 'deactivated');
	}
	return rootNodes;
}
