import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as contents from '@kingdom-builder/contents';

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

const fallbackConfig = {
	phases: contents.PHASES,
	start: contents.GAME_START,
	rules: contents.RULES,
	resources: fallbackResources,
	primaryIconId: contents.PRIMARY_ICON_ID ?? null,
};

const filePath = resolve('packages/web/src/startup/runtimeConfigFallback.json');
writeFileSync(filePath, `${JSON.stringify(fallbackConfig, null, 2)}\n`);
