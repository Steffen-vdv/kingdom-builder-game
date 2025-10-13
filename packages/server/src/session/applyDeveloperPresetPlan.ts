import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import { buildSessionMetadata } from '../content/buildSessionMetadata.js';
import type {
	SessionDeveloperPresetPlan,
	SessionDeveloperPresetPlayerPlan,
} from '@kingdom-builder/protocol/session';
type DeveloperPresetOptions = Parameters<
	EngineSession['applyDeveloperPreset']
>[0];
type SessionMetadataBundle = ReturnType<typeof buildSessionMetadata>;
type PlanPlayer = SessionDeveloperPresetPlayerPlan;
type MetadataRecord = Record<string, unknown> | undefined;

const PLAYER_ID_SET = new Set<PlayerId>(['A', 'B']);

const isPlayerId = (value: unknown): value is PlayerId => {
	if (typeof value !== 'string') {
		return false;
	}
	return PLAYER_ID_SET.has(value as PlayerId);
};

let cachedBundle: SessionMetadataBundle | undefined;

const isFiniteNumber = (value: unknown): value is number => {
	return typeof value === 'number' && Number.isFinite(value);
};

const getMetadataBundle = (): SessionMetadataBundle => {
	if (!cachedBundle) {
		cachedBundle = buildSessionMetadata();
	}
	return cachedBundle;
};

const getDeveloperPresetPlan = (): SessionDeveloperPresetPlan | undefined => {
	const bundle = getMetadataBundle();
	return bundle.developerPresetPlan;
};

const filterResourceTargets = (
	plan: PlanPlayer,
	metadata: SessionMetadataBundle,
): DeveloperPresetOptions['resources'] => {
	if (!plan.resources || plan.resources.length === 0) {
		return undefined;
	}
	const resourceMetadata = metadata.resources ?? {};
	const valid: DeveloperPresetOptions['resources'] = [];
	for (const entry of plan.resources) {
		if (!resourceMetadata?.[entry.key]) {
			continue;
		}
		if (!isFiniteNumber(entry.target)) {
			continue;
		}
		valid.push({ key: entry.key, target: entry.target });
	}
	return valid.length > 0 ? valid : undefined;
};

const filterPopulationPlan = (
	plan: PlanPlayer,
	metadata: SessionMetadataBundle,
): DeveloperPresetOptions['population'] => {
	if (!plan.population || plan.population.length === 0) {
		return undefined;
	}
	const populationMetadata = metadata.populations ?? {};
	const valid: DeveloperPresetOptions['population'] = [];
	for (const entry of plan.population) {
		if (!populationMetadata?.[entry.role]) {
			continue;
		}
		if (!isFiniteNumber(entry.count)) {
			continue;
		}
		valid.push({ role: entry.role, count: entry.count });
	}
	return valid.length > 0 ? valid : undefined;
};

const filterIdentifiers = (
	values: readonly string[] | undefined,
	metadata: MetadataRecord,
): string[] | undefined => {
	if (!values || values.length === 0) {
		return undefined;
	}
	if (!metadata) {
		return undefined;
	}
	const valid: string[] = [];
	for (const id of values) {
		if (typeof id !== 'string' || id.length === 0) {
			continue;
		}
		if (!(id in metadata)) {
			continue;
		}
		valid.push(id);
	}
	return valid.length > 0 ? valid : undefined;
};

const buildDeveloperPresetOptions = (
	playerPlan: PlanPlayer,
	metadata: SessionMetadataBundle,
): DeveloperPresetOptions | null => {
	if (!isPlayerId(playerPlan.playerId)) {
		return null;
	}
	const options: DeveloperPresetOptions = {
		playerId: playerPlan.playerId,
	};
	const resourceTargets = filterResourceTargets(playerPlan, metadata);
	if (resourceTargets) {
		options.resources = resourceTargets;
	}
	const populationPlan = filterPopulationPlan(playerPlan, metadata);
	if (populationPlan) {
		options.population = populationPlan;
	}
	const developmentIds = filterIdentifiers(
		playerPlan.developments,
		metadata.developments,
	);
	if (developmentIds) {
		options.developments = developmentIds;
	}
	const buildingIds = filterIdentifiers(
		playerPlan.buildings,
		metadata.buildings,
	);
	if (buildingIds) {
		options.buildings = buildingIds;
	}
	if (isFiniteNumber(playerPlan.landCount)) {
		options.landCount = playerPlan.landCount;
	}
	if (
		!resourceTargets &&
		!populationPlan &&
		!developmentIds &&
		!buildingIds &&
		options.landCount === undefined
	) {
		return null;
	}
	return options;
};

export function applyDeveloperPresetPlan(session: EngineSession): void {
	const plan = getDeveloperPresetPlan();
	if (!plan) {
		return;
	}
	const metadata = getMetadataBundle();
	const snapshot = session.getSnapshot();
	const players = snapshot.game.players ?? [];
	const playerIds = new Set(players.map((player) => player.id));
	for (const playerPlan of plan.players) {
		if (!isPlayerId(playerPlan.playerId)) {
			continue;
		}
		if (!playerIds.has(playerPlan.playerId)) {
			continue;
		}
		const options = buildDeveloperPresetOptions(playerPlan, metadata);
		if (!options) {
			continue;
		}
		session.applyDeveloperPreset(options);
	}
}
