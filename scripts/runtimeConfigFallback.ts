import * as contents from '@kingdom-builder/contents';

export function buildRuntimeConfigFallback(): {
	phases: typeof contents.PHASES;
	start: typeof contents.GAME_START;
	rules: typeof contents.RULES;
	resources: Record<string, Record<string, unknown>>;
	primaryIconId: string | null;
} {
	const fallbackResources = Object.fromEntries(
		Object.entries(contents.RESOURCES).map(([key, definition]) => {
			const entry: Record<string, unknown> = { key };
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
			return [key, entry];
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
