import * as contents from '@kingdom-builder/contents';

export function buildRuntimeConfigFallback(): {
	phases: typeof contents.PHASES;
	start: typeof contents.GAME_START;
	rules: typeof contents.RULES;
	resources: Record<string, Record<string, unknown>>;
	primaryIconId: string | null;
} {
	// Use ResourceV2 registry for resource metadata
	const fallbackResources = Object.fromEntries(
		contents.RESOURCE_V2_REGISTRY.ordered.map((definition) => {
			const entry: Record<string, unknown> = { key: definition.id };
			if (definition.icon !== undefined) {
				entry.icon = definition.icon;
			}
			if (definition.label !== undefined) {
				entry.label = definition.label;
			}
			if (definition.description !== undefined) {
				entry.description = definition.description;
			}
			if (definition.tags && definition.tags.length > 0) {
				entry.tags = [...definition.tags];
			}
			return [definition.id, entry];
		}),
	);

	return {
		phases: contents.PHASES,
		start: contents.GAME_START,
		rules: contents.RULES,
		resources: fallbackResources,
		primaryIconId: contents.PRIMARY_ICON_ID ?? null,
	};
}

export type RuntimeConfigFallback = ReturnType<
	typeof buildRuntimeConfigFallback
>;
