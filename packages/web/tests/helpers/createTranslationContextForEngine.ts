import { RESOURCES, TRIGGER_INFO } from '@kingdom-builder/contents';
import type { EngineContext } from '@kingdom-builder/engine';
import { snapshotEngine } from '../../../engine/src/runtime/engine_snapshot';
import { createTranslationContext } from '../../src/translation/context';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';

const RESOURCE_REGISTRY: Record<string, SessionResourceDefinition> =
	buildResourceRegistry();
const TRIGGER_REGISTRY = buildTriggerRegistry();

function buildResourceRegistry(): Record<string, SessionResourceDefinition> {
	const entries: Record<string, SessionResourceDefinition> = {};
	for (const [key, definition] of Object.entries(RESOURCES)) {
		entries[key] = Object.freeze({
			key: definition.key ?? key,
			...(definition.icon !== undefined ? { icon: definition.icon } : {}),
			...(definition.label !== undefined ? { label: definition.label } : {}),
			...(definition.description !== undefined
				? { description: definition.description }
				: {}),
			...(definition.tags && definition.tags.length
				? { tags: [...definition.tags] }
				: {}),
		});
	}
	return entries;
}

export function createTranslationContextForEngine(
	context: EngineContext,
): ReturnType<typeof createTranslationContext> {
	const snapshot = snapshotEngine(context);
	const registries: SessionRegistries = {
		actions: context.actions,
		buildings: context.buildings,
		developments: context.developments,
		populations: context.populations,
		resources: RESOURCE_REGISTRY,
	};
	const translationContext = createTranslationContext(
		snapshot,
		registries,
		snapshot.metadata,
		{
			ruleSnapshot: snapshot.rules,
			passiveRecords: snapshot.passiveRecords,
		},
	);
	return {
		...translationContext,
		assets: {
			...translationContext.assets,
			triggers: TRIGGER_REGISTRY,
		},
	};
}

function buildTriggerRegistry() {
	const entries: Record<
		string,
		{ icon?: string; future?: string; past?: string }
	> = {};
	for (const [key, definition] of Object.entries(TRIGGER_INFO)) {
		entries[key] = Object.freeze({
			icon: definition.icon,
			future: definition.future,
			past: definition.past,
		});
	}
	return Object.freeze(entries);
}
