import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import type {
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from './sessionRegistries';

const DEFAULT_RESOURCE_TARGET = 100;
const DEFAULT_TIER_TARGET = 10;
const DEFAULT_LAND_TARGET = 5;

type DeveloperRegistries = Pick<
	SessionRegistries,
	'developments' | 'resources' | 'buildings'
>;

type DeveloperModeOptions = {
	snapshot: SessionSnapshot;
	registries: DeveloperRegistries;
	ruleSnapshot: SessionRuleSnapshot;
};

const toStringId = (id: string | number): string => String(id);

const selectCurrencyResource = (
	resources: DeveloperRegistries['resources'],
): string | undefined => {
	const entries = Object.values(resources);
	for (const definition of entries) {
		if (definition.tags?.includes('bankruptcy-check')) {
			return definition.key;
		}
	}
	return entries[0]?.key;
};

const buildResourceTargets = (
	player: SessionSnapshot['game']['players'][number],
	registries: DeveloperRegistries,
	ruleSnapshot: SessionRuleSnapshot,
) => {
	const targets: Array<{ key: string; target: number }> = [];
	const currencyKey = selectCurrencyResource(registries.resources);
	if (currencyKey) {
		const current = player.resources[currencyKey] ?? 0;
		targets.push({
			key: currencyKey,
			target: Math.max(current, DEFAULT_RESOURCE_TARGET),
		});
	}
	const tierKey = ruleSnapshot.tieredResourceKey;
	if (tierKey) {
		const current = player.resources[tierKey] ?? 0;
		if (targets.length > 0 && targets[0]?.key === tierKey) {
			targets[0].target = Math.max(targets[0].target, DEFAULT_TIER_TARGET);
		} else {
			targets.push({
				key: tierKey,
				target: Math.max(current, DEFAULT_TIER_TARGET),
			});
		}
	}
	return targets;
};

const buildPopulationPlan = (
	player: SessionSnapshot['game']['players'][number],
) => {
	const entries = Object.entries(player.population ?? {});
	const plan: Array<{ role: string; count: number }> = [];
	for (const [role, count] of entries) {
		if (typeof count !== 'number' || count <= 0) {
			continue;
		}
		plan.push({ role, count: count + 1 });
	}
	return plan;
};

const buildDevelopmentPlan = (
	registries: DeveloperRegistries['developments'],
) => {
	const identifiers: string[] = [];
	for (const [identifier, definition] of registries.entries()) {
		const resolvedId = toStringId(definition.id ?? identifier);
		if (definition.system) {
			continue;
		}
		identifiers.push(resolvedId);
	}
	return identifiers.sort((left, right) => left.localeCompare(right));
};

const buildBuildingPlan = (
	registries: DeveloperRegistries['buildings'],
	player: SessionSnapshot['game']['players'][number],
) => {
	const existing = new Set(player.buildings);
	if (existing.size > 0) {
		return [] as string[];
	}
	for (const [identifier, definition] of registries.entries()) {
		const resolvedId = toStringId(definition.id ?? identifier);
		if (!existing.has(resolvedId)) {
			return [resolvedId];
		}
	}
	return [] as string[];
};

export function initializeDeveloperMode(
	session: EngineSession,
	playerId: PlayerId,
	options: DeveloperModeOptions,
): void {
	const player = options.snapshot.game.players.find(
		(entry) => entry.id === playerId,
	);
	if (!player) {
		return;
	}
	const resources = buildResourceTargets(
		player,
		options.registries,
		options.ruleSnapshot,
	);
	const population = buildPopulationPlan(player);
	const developments = buildDevelopmentPlan(options.registries.developments);
	const buildings = buildBuildingPlan(options.registries.buildings, player);
	const landCount = Math.max(
		player.lands.length,
		developments.length,
		DEFAULT_LAND_TARGET,
	);
	session.applyDeveloperPreset({
		playerId,
		...(resources.length ? { resources } : {}),
		...(population.length ? { population } : {}),
		...(developments.length ? { developments } : {}),
		...(buildings.length ? { buildings } : {}),
		landCount,
	});
}
