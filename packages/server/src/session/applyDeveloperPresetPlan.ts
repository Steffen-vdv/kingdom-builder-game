import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import type {
	SessionDeveloperPresetPlan,
	SessionDeveloperPresetPlanEntry,
} from '@kingdom-builder/protocol';
import { buildSessionMetadata } from '../content/buildSessionMetadata.js';

type DeveloperPresetOptions = Parameters<
	EngineSession['applyDeveloperPreset']
>[0];

type NumericRecord = Record<string, number>;

type PlayerPlanMap = Record<string, SessionDeveloperPresetPlanEntry>;

let cachedPlan: SessionDeveloperPresetPlan | null | undefined;

const numberIsFinite = (value: unknown): value is number => {
	return typeof value === 'number' && Number.isFinite(value);
};

const resolvePlan = (): SessionDeveloperPresetPlan | undefined => {
	if (cachedPlan === undefined) {
		cachedPlan = buildSessionMetadata().developerPresetPlan ?? null;
	}
	return cachedPlan ?? undefined;
};

const mergeNumericRecords = (
	base: NumericRecord | undefined,
	override: NumericRecord | undefined,
): NumericRecord | undefined => {
	if (!base && !override) {
		return undefined;
	}
	const merged: NumericRecord = {};
	const assign = (source: NumericRecord | undefined): void => {
		if (!source) {
			return;
		}
		for (const [key, value] of Object.entries(source)) {
			if (!numberIsFinite(value)) {
				continue;
			}
			merged[key] = value;
		}
	};
	assign(base);
	assign(override);
	return Object.keys(merged).length > 0 ? merged : undefined;
};

const uniqueStrings = (values: string[] | undefined): string[] => {
	if (!values) {
		return [];
	}
	const identifiers = new Set<string>();
	for (const value of values) {
		if (typeof value !== 'string' || value.trim().length === 0) {
			continue;
		}
		identifiers.add(value);
	}
	return [...identifiers];
};

const mergePlanEntries = (
	base: SessionDeveloperPresetPlanEntry | undefined,
	override: SessionDeveloperPresetPlanEntry | undefined,
): SessionDeveloperPresetPlanEntry | undefined => {
	if (!base && !override) {
		return undefined;
	}
	const merged: SessionDeveloperPresetPlanEntry = {};
	const resources = mergeNumericRecords(base?.resources, override?.resources);
	if (resources) {
		merged.resources = resources;
	}
	const population = mergeNumericRecords(
		base?.population,
		override?.population,
	);
	if (population) {
		merged.population = population;
	}
	const landCount = numberIsFinite(override?.landCount)
		? override?.landCount
		: numberIsFinite(base?.landCount)
			? base?.landCount
			: undefined;
	if (numberIsFinite(landCount) && landCount > 0) {
		merged.landCount = landCount;
	}
	const developments =
		override?.developments && override.developments.length > 0
			? uniqueStrings(override.developments)
			: uniqueStrings(base?.developments);
	if (developments.length > 0) {
		merged.developments = developments;
	}
	const buildings =
		override?.buildings && override.buildings.length > 0
			? uniqueStrings(override.buildings)
			: uniqueStrings(base?.buildings);
	if (buildings.length > 0) {
		merged.buildings = buildings;
	}
	return Object.keys(merged).length > 0 ? merged : undefined;
};

const toResourceTargets = (
	record: NumericRecord | undefined,
): Array<{ key: string; target: number }> => {
	if (!record) {
		return [];
	}
	const targets: Array<{ key: string; target: number }> = [];
	for (const [key, value] of Object.entries(record)) {
		if (!numberIsFinite(value)) {
			continue;
		}
		targets.push({ key, target: value });
	}
	return targets;
};

const toPopulationPlan = (
	record: NumericRecord | undefined,
): Array<{ role: string; count: number }> => {
	if (!record) {
		return [];
	}
	const entries: Array<{ role: string; count: number }> = [];
	for (const [role, value] of Object.entries(record)) {
		if (!numberIsFinite(value)) {
			continue;
		}
		entries.push({ role, count: value });
	}
	return entries;
};

const buildPresetOptions = (
	playerId: PlayerId,
	entry: SessionDeveloperPresetPlanEntry,
): DeveloperPresetOptions | undefined => {
	const options: DeveloperPresetOptions = { playerId };
	let hasInstruction = false;
	const resources = toResourceTargets(entry.resources);
	if (resources.length > 0) {
		options.resources = resources;
		hasInstruction = true;
	}
	const population = toPopulationPlan(entry.population);
	if (population.length > 0) {
		options.population = population;
		hasInstruction = true;
	}
	if (numberIsFinite(entry.landCount) && entry.landCount > 0) {
		options.landCount = entry.landCount;
		hasInstruction = true;
	}
	const developments = uniqueStrings(entry.developments);
	if (developments.length > 0) {
		options.developments = developments;
		hasInstruction = true;
	}
	const buildings = uniqueStrings(entry.buildings);
	if (buildings.length > 0) {
		options.buildings = buildings;
		hasInstruction = true;
	}
	return hasInstruction ? options : undefined;
};

export function applyDeveloperPresetPlan(session: EngineSession): void {
	const plan = resolvePlan();
	if (!plan) {
		return;
	}
	const snapshot = session.getSnapshot();
	const players = snapshot.game.players;
	if (!Array.isArray(players) || players.length === 0) {
		return;
	}
	const overrides: PlayerPlanMap = plan.players ?? {};
	for (const player of players) {
		const mergedPlan = mergePlanEntries(plan.default, overrides[player.id]);
		if (!mergedPlan) {
			continue;
		}
		const options = buildPresetOptions(player.id as PlayerId, mergedPlan);
		if (!options) {
			continue;
		}
		session.applyDeveloperPreset(options);
	}
}
