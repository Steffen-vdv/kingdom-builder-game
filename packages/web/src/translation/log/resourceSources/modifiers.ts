import { PASSIVE_INFO } from '@kingdom-builder/contents';
import { type EngineContext, type PlayerId } from '@kingdom-builder/engine';
import { resolveBuildingIcon } from '../../content/buildingIcons';
import {
	type PassiveDescriptor,
	type PassiveModifierMap,
	type ResourceSourceEntry,
} from './types';

type PassiveLookup = {
	evaluationMods?: PassiveModifierMap;
	get?: (id: string, owner: PlayerId) => PassiveDescriptor | undefined;
};

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
	passives: PassiveLookup,
	context: EngineContext,
): string {
	const parts = baseKey.split('_');
	for (let i = parts.length; i > 0; i -= 1) {
		const candidate = parts.slice(0, i).join('_');
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
	return PASSIVE_INFO.icon || '';
}

export function appendEvaluatorModifiers(
	entry: ResourceSourceEntry,
	evaluator: { type: string; params?: Record<string, unknown> },
	context: EngineContext,
	ownerSuffix: string,
) {
	const rawPassives = context.passives as unknown;
	const passives = rawPassives as PassiveLookup;
	const modsMap = passives.evaluationMods?.get(
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
