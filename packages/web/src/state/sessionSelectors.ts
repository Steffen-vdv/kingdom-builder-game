import type {
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@boardsmith/protocol/session';
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
const mapPlayer = (player: SessionPlayerStateSnapshot): SessionPlayerView => {
	// Support both new actionStates and legacy actions array
	const actionStates = player.actionStates ?? {};
	const hasActionStates = Object.keys(actionStates).length > 0;

	// Derive available actions:
	// - If actionStates exists, use it (available when !locked && !poolLocked)
	// - Otherwise fall back to legacy actions array
	const availableActionIds = hasActionStates
		? Object.entries(actionStates)
				.filter(([, state]) => !state.locked && !state.poolLocked)
				.map(([id]) => id)
		: player.actions;

	return {
		...player,
		resourceTouched: cloneRecord(player.resourceTouched),
		values: cloneRecord(player.values),
		passives: [...player.passives],
		lands: player.lands.map(mapLand),
		buildings: new Set(player.buildings),
		actions: new Set(availableActionIds),
		actionStates,
	};
};
/**
 * Create a base action option from definition.
 * Tier-specific costs are resolved using the starting tier.
 * Player-specific tier info is added in buildActionSelections.
 */
const createActionOption = (
	id: string,
	definition: ActionDefinition,
	currentTier?: number,
): SessionActionOption => {
	// Calculate tier boundaries
	const tierKeys = Object.keys(definition.tiers);
	const tierNumbers = tierKeys.map(Number).filter((n) => !isNaN(n));
	const startingTier = tierNumbers.length > 0 ? Math.min(...tierNumbers) : 1;
	const maxTier = tierNumbers.length > 0 ? Math.max(...tierNumbers) : 1;

	// Use player's current tier if available, otherwise starting tier
	const displayTier = currentTier ?? startingTier;
	const tierConfig = definition.tiers[String(displayTier)];
	const baseCosts = tierConfig?.costs;

	return {
		id: definition.id ?? id,
		name: definition.name,
		icon: definition.icon,
		system: definition.system,
		order: definition.order,
		category: definition.category,
		metaCategory: definition.metaCategory,
		focus: definition.focus,
		baseCosts: baseCosts ? cloneRecord(baseCosts) : undefined,
		currentTier: displayTier,
		maxTier,
	};
};
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
	// Collect all available actions across all players
	const unlocked = new Set<string>();
	for (const player of players) {
		for (const actionId of player.actions) {
			unlocked.add(actionId);
		}
	}

	// Create base list (without player-specific tier info)
	const list = actions
		.entries()
		.map(([id, definition]) => createActionOption(id, definition))
		.filter((option) => unlocked.has(option.id))
		.sort(helpers.sortActions ?? defaultActionSort);
	const map = new Map(list.map((option) => [option.id, option]));

	// Create player-specific action lists with correct tier info
	const byPlayer = new Map<string, SessionActionOption[]>();
	for (const player of players) {
		const options: SessionActionOption[] = [];
		for (const [id, definition] of actions.entries()) {
			if (!player.actions.has(id)) {
				continue;
			}
			// Get player's current tier from actionStates
			const actionState = player.actionStates[id];
			const currentTier = actionState?.currentTier;
			// Create player-specific option with correct tier
			const option = createActionOption(id, definition, currentTier);
			options.push(option);
		}
		options.sort(helpers.sortActions ?? defaultActionSort);
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
