import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type {
	ActionDefinition,
	BuildingDefinition,
	DevelopmentDefinition,
	RegistryLike,
	SessionActionOption,
	SessionBuildingOption,
	SessionDevelopmentOption,
	SessionLandView,
	SessionOptionSelection,
	SessionPlayerView,
	SessionSelectorHelpers,
} from './sessionSelectors.types';
import type { SessionRegistries } from './sessionTypes';

const cloneRecord = <T>(record: Record<string, T>) => ({ ...record });
const mapLand = (
	land: SessionPlayerStateSnapshot['lands'][number],
): SessionLandView => ({
	...land,
	slotsFree: Math.max(0, land.slotsMax - land.slotsUsed),
});
const mapPlayer = (player: SessionPlayerStateSnapshot): SessionPlayerView => ({
	...player,
	resources: cloneRecord(player.resources),
	stats: cloneRecord(player.stats),
	statsHistory: cloneRecord(player.statsHistory),
	population: cloneRecord(player.population),
	passives: [...player.passives],
	lands: player.lands.map(mapLand),
	buildings: new Set(player.buildings),
	actions: new Set(player.actions),
});
const createActionOption = (
	id: string,
	definition: ActionDefinition,
): SessionActionOption => ({
	id: definition.id ?? id,
	name: definition.name,
	icon: definition.icon,
	system: definition.system,
	order: definition.order,
	category: definition.category,
	focus: definition.focus,
	baseCosts: definition.baseCosts
		? cloneRecord(definition.baseCosts)
		: undefined,
});
const createBuildingOption = (
	id: string,
	definition: BuildingDefinition,
): SessionBuildingOption => ({
	id: definition.id ?? id,
	name: definition.name,
	icon: definition.icon,
	focus: definition.focus,
	costs: cloneRecord(definition.costs),
	upkeep: definition.upkeep ? cloneRecord(definition.upkeep) : undefined,
});
const createDevelopmentOption = (
	id: string,
	definition: DevelopmentDefinition,
): SessionDevelopmentOption => ({
	id: definition.id ?? id,
	name: definition.name,
	icon: definition.icon,
	system: definition.system,
	order: definition.order,
	focus: definition.focus,
	upkeep: definition.upkeep ? cloneRecord(definition.upkeep) : undefined,
});
const defaultActionSort = (
	left: SessionActionOption,
	right: SessionActionOption,
) =>
	(left.order ?? 0) - (right.order ?? 0) || left.name.localeCompare(right.name);
const defaultBuildingSort = (
	left: SessionBuildingOption,
	right: SessionBuildingOption,
) => left.name.localeCompare(right.name);
const defaultDevelopmentSort = (
	left: SessionDevelopmentOption,
	right: SessionDevelopmentOption,
) =>
	(left.order ?? 0) - (right.order ?? 0) || left.name.localeCompare(right.name);

export const selectSessionPlayers = (sessionState: SessionSnapshot) => {
	const list = sessionState.game.players.map(mapPlayer);
	const byId = new Map(list.map((player) => [player.id, player]));
	return {
		list,
		byId,
		active: byId.get(sessionState.game.activePlayerId),
		opponent: byId.get(sessionState.game.opponentId),
	};
};

type SessionPlayersSelection = ReturnType<typeof selectSessionPlayers>;

const buildActionSelections = (
	players: SessionPlayerView[],
	actions: RegistryLike<ActionDefinition>,
	helpers: SessionSelectorHelpers,
) => {
	const unlocked = new Set<string>();
	for (const player of players) {
		for (const actionId of player.actions) {
			unlocked.add(actionId);
		}
	}
	const list = actions
		.entries()
		.map(([id, definition]) => createActionOption(id, definition))
		.filter((option) => unlocked.has(option.id))
		.sort(helpers.sortActions ?? defaultActionSort);
	const map = new Map(list.map((option) => [option.id, option]));
	const byPlayer = new Map<string, SessionActionOption[]>();
	for (const player of players) {
		const options: SessionActionOption[] = [];
		for (const option of list) {
			if (!player.actions.has(option.id)) {
				continue;
			}
			options.push(option);
		}
		byPlayer.set(player.id, options);
	}
	return { map, list, byPlayer };
};

const buildSimpleSelections = <TDefinition, TOption extends { id: string }>(
	registry: RegistryLike<TDefinition>,
	mapFn: (id: string, definition: TDefinition) => TOption,
	sortFn: (left: TOption, right: TOption) => number,
	filterFn?: (option: TOption) => boolean,
) => {
	const list = registry
		.entries()
		.map(([id, definition]) => mapFn(id, definition))
		.filter((option) => (filterFn ? filterFn(option) : true))
		.sort(sortFn);
	return { map: new Map(list.map((option) => [option.id, option])), list };
};

const buildSessionOptionsFromPlayers = (
	players: SessionPlayerView[],
	registries: SessionRegistries,
	helpers: SessionSelectorHelpers,
): SessionOptionSelection => {
	const actions = buildActionSelections(players, registries.actions, helpers);
	const buildings = buildSimpleSelections(
		registries.buildings,
		createBuildingOption,
		helpers.sortBuildings ?? defaultBuildingSort,
	);
	const developments = buildSimpleSelections(
		registries.developments,
		createDevelopmentOption,
		helpers.sortDevelopments ?? defaultDevelopmentSort,
		(option) => !option.system,
	);
	return {
		actions: actions.map,
		actionList: actions.list,
		actionsByPlayer: actions.byPlayer,
		buildings: buildings.map,
		buildingList: buildings.list,
		developments: developments.map,
		developmentList: developments.list,
	};
};

export const selectSessionOptions = (
	sessionState: SessionSnapshot,
	registries: SessionRegistries,
	helpers: SessionSelectorHelpers = {},
): SessionOptionSelection =>
	buildSessionOptionsFromPlayers(
		selectSessionPlayers(sessionState).list,
		registries,
		helpers,
	);

export const selectSessionView = (
	sessionState: SessionSnapshot,
	registries: SessionRegistries,
	helpers: SessionSelectorHelpers = {},
) => {
	const players = selectSessionPlayers(sessionState);
	return {
		...players,
		...buildSessionOptionsFromPlayers(players.list, registries, helpers),
	};
};

export type {
	SessionActionOption,
	SessionBuildingOption,
	SessionDevelopmentOption,
	SessionLandView,
	SessionOptionSelection,
	SessionPlayerView,
	SessionSelectorHelpers,
} from './sessionSelectors.types';
export type { SessionRegistries } from './sessionTypes';
type SessionView = ReturnType<typeof selectSessionView>;
export type { SessionPlayersSelection, SessionView };
