import { resolvePassivePresentation } from './passives';
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

export function appendPassiveChanges(
	changes: string[],
	before: PlayerSnapshot,
	after: PlayerSnapshot,
	assets: TranslationAssets,
) {
	const previous = createPassiveMap(before.passives);
	const next = createPassiveMap(after.passives);
	const previousContext = createPassiveVisibilityContext(before);
	const nextContext = createPassiveVisibilityContext(after);
	for (const [id, passive] of next) {
		if (previous.has(id)) {
			continue;
		}
		if (!shouldSurfacePassive(passive, nextContext, 'log')) {
			continue;
		}
		const { icon, label } = resolvePassivePresentation(passive, {
			assets,
		});
		const decoratedLabel = decoratePassiveLabel(icon, label, assets);
		const entry = `${decoratedLabel} activated`;
		if (!changes.includes(entry)) {
			changes.push(entry);
		}
	}
	for (const [id, passive] of previous) {
		if (next.has(id)) {
			continue;
		}
		if (!shouldSurfacePassive(passive, previousContext, 'log')) {
			continue;
		}
		const { icon, label } = resolvePassivePresentation(passive, {
			assets,
		});
		const decoratedLabel = decoratePassiveLabel(icon, label, assets);
		const entry = `${decoratedLabel} deactivated`;
		if (!changes.includes(entry)) {
			changes.push(entry);
		}
	}
}
