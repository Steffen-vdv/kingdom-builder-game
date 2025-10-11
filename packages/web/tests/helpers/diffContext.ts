import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import type { TranslationDiffContext } from '../../src/translation/log/resourceSources/context';
import { createTranslationDiffContext } from '../../src/translation/log/resourceSources/context';
import type {
	TranslationResourceDefinition,
	TranslationResourceRegistry,
} from '../../src/translation/context';

interface ResourceDefinitionOverride {
	key?: string;
	icon?: string;
	label?: string;
	description?: string;
	tags?: readonly string[] | string[];
}

type ResourceInput = SessionResourceDefinition | ResourceDefinitionOverride;

function normalizeResourceDefinition(
	key: string,
	definition: ResourceInput,
): TranslationResourceDefinition {
	const tags = definition.tags
		? Object.freeze([...(definition.tags as string[])])
		: undefined;
	return Object.freeze({
		key: definition.key ?? key,
		...(definition.icon !== undefined ? { icon: definition.icon } : {}),
		...(definition.label !== undefined ? { label: definition.label } : {}),
		...(definition.description !== undefined
			? { description: definition.description }
			: {}),
		...(tags ? { tags } : {}),
	});
}

export function createTestResourceRegistry(
	resources: Record<string, ResourceInput>,
): TranslationResourceRegistry {
	const entries = Object.entries(resources).map(
		([key, definition]) =>
			[key, normalizeResourceDefinition(key, definition)] as const,
	);
	const map = new Map(entries);
	const keys = Object.freeze(entries.map(([entryKey]) => entryKey));
	return {
		get(requested: string) {
			return map.get(requested);
		},
		keys() {
			return keys;
		},
	};
}

export function createEngineDiffContext(
	engineContext: Pick<
		TranslationDiffContext,
		'activePlayer' | 'buildings' | 'developments' | 'populations'
	> & { passives: unknown },
	resources: TranslationResourceRegistry,
): TranslationDiffContext {
	return createTranslationDiffContext({
		activePlayer: engineContext.activePlayer,
		buildings: engineContext.buildings,
		developments: engineContext.developments,
		populations: engineContext.populations,
		passives: engineContext.passives,
		resources,
	});
}
