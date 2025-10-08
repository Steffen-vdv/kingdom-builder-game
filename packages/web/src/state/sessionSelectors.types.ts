import type { PlayerStateSnapshot } from '@kingdom-builder/engine';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
} from '@kingdom-builder/protocol';

type RegistryLike<T> = { entries(): [string, T][]; get(id: string): T };
type ActionDefinition = ActionConfig &
	Partial<{ id: string; category: string; order: number; focus: unknown }>;
type BuildingDefinition = BuildingConfig &
	Partial<{ id: string; focus: unknown }>;
type DevelopmentDefinition = DevelopmentConfig &
	Partial<{ id: string; order: number; focus: unknown; system: boolean }>;
type SessionLandView = PlayerStateSnapshot['lands'][number] & {
	slotsFree: number;
};
type SessionPlayerView = Omit<
	PlayerStateSnapshot,
	'lands' | 'buildings' | 'actions'
> & {
	lands: SessionLandView[];
	buildings: Set<string>;
	actions: Set<string>;
};
type SessionActionOption = {
	id: string;
	name: string;
	icon?: string | undefined;
	system?: boolean | undefined;
	order?: number | undefined;
	category?: string | undefined;
	focus?: unknown;
};
type SessionBuildingOption = {
	id: string;
	name: string;
	icon?: string | undefined;
	focus?: unknown;
	costs: BuildingDefinition['costs'];
	upkeep?: BuildingDefinition['upkeep'] | undefined;
};
type SessionDevelopmentOption = {
	id: string;
	name: string;
	icon?: string | undefined;
	system?: boolean | undefined;
	order?: number | undefined;
	focus?: unknown;
	upkeep?: DevelopmentDefinition['upkeep'] | undefined;
};
type SessionOptionSelection = {
	actions: Map<string, SessionActionOption>;
	actionList: SessionActionOption[];
	actionsByPlayer: Map<string, SessionActionOption[]>;
	buildings: Map<string, SessionBuildingOption>;
	buildingList: SessionBuildingOption[];
	developments: Map<string, SessionDevelopmentOption>;
	developmentList: SessionDevelopmentOption[];
};
type SessionSelectorHelpers = {
	sortActions?: (a: SessionActionOption, b: SessionActionOption) => number;
	sortBuildings?: (
		a: SessionBuildingOption,
		b: SessionBuildingOption,
	) => number;
	sortDevelopments?: (
		a: SessionDevelopmentOption,
		b: SessionDevelopmentOption,
	) => number;
};
type SessionRegistries = {
	actions: RegistryLike<ActionDefinition>;
	buildings: RegistryLike<BuildingDefinition>;
	developments: RegistryLike<DevelopmentDefinition>;
};

export type {
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
	SessionRegistries,
	SessionSelectorHelpers,
};
