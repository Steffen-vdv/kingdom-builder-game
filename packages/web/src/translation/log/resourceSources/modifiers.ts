import { resolveBuildingIcon } from '../../content/buildingIcons';
import {
	type TranslationDiffContext,
	type TranslationDiffPassives,
} from './context';
import { type ResourceSourceEntry } from './types';

const DEFAULT_PASSIVE_ICON = '♾️';

export function resolveEvaluatorTarget(evaluator: {
	type: string;
	params?: Record<string, unknown>;
}): string {
	if (evaluator.params && 'id' in evaluator.params) {
		const rawId = evaluator.params['id'];
		return `${evaluator.type}:${String(rawId)}`;
	}
	return evaluator.type;
}

function resolveModifierIcon(
	baseKey: string,
	passives: TranslationDiffPassives,
	context: TranslationDiffContext,
): string {
	const parts = baseKey.split('_');
	for (let partIndex = parts.length; partIndex > 0; partIndex -= 1) {
		const candidate = parts.slice(0, partIndex).join('_');
		const icon = resolveBuildingIcon(candidate, context);
		if (icon) {
			return icon;
		}
	}
	if (passives.get) {
		const passive = passives.get(baseKey, context.activePlayer.id);
		if (passive?.icon) {
			return passive.icon;
		}
		if (passive?.meta?.source?.icon) {
			return passive.meta.source.icon ?? '';
		}
	}
	return DEFAULT_PASSIVE_ICON;
}

export function appendEvaluatorModifiers(
	entry: ResourceSourceEntry,
	evaluator: { type: string; params?: Record<string, unknown> },
	context: TranslationDiffContext,
	ownerSuffix: string,
) {
	const passives = context.passives;
	const modsMap = passives.evaluationMods.get(
		resolveEvaluatorTarget(evaluator),
	);
	if (!modsMap) {
		return;
	}
	for (const modKey of modsMap.keys()) {
		if (!modKey.endsWith(ownerSuffix)) {
			continue;
		}
		const baseKey = modKey.replace(ownerSuffix, '');
		const icon = resolveModifierIcon(baseKey, passives, context);
		if (icon) {
			entry.mods += icon;
		}
	}
}
