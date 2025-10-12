import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as contents from '@kingdom-builder/contents';

const developmentRegistry = contents.createDevelopmentRegistry();
const developmentIds: string[] = [];
for (const [identifier, definition] of developmentRegistry.entries()) {
	if (definition?.system) {
		continue;
	}
	developmentIds.push(identifier);
}
developmentIds.sort((left, right) => {
	const leftOrder =
		typeof developmentRegistry.get(left)?.order === 'number'
			? (developmentRegistry.get(left)?.order as number)
			: Number.MAX_SAFE_INTEGER;
	const rightOrder =
		typeof developmentRegistry.get(right)?.order === 'number'
			? (developmentRegistry.get(right)?.order as number)
			: Number.MAX_SAFE_INTEGER;
	if (leftOrder !== rightOrder) {
		return leftOrder - rightOrder;
	}
	return left.localeCompare(right);
});

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
	developerPreset: {
		resourceTargets: [
			{ key: contents.Resource.gold, target: 100 },
			{ key: contents.Resource.happiness, target: 10 },
		],
		populationPlan: [
			{ role: contents.PopulationRole.Council, count: 2 },
			{ role: contents.PopulationRole.Legion, count: 1 },
			{ role: contents.PopulationRole.Fortifier, count: 1 },
		],
		landCount: 5,
		developments: developmentIds,
		buildings: [contents.BuildingId.Mill],
	},
};

const filePath = resolve('packages/web/src/startup/runtimeConfigFallback.json');
writeFileSync(filePath, `${JSON.stringify(fallbackConfig, null, 2)}\n`);
