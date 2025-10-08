import type { SessionRegistries } from '../../src/state/sessionSelectors.types';
import type { selectSessionView } from '../../src/state/sessionSelectors';

const REGISTRY_ERROR = 'Session registry stub accessed unexpectedly.';

const createRegistryStub = <T>(): SessionRegistries['actions'] => ({
	entries() {
		return [] as [string, T][];
	},
	get() {
		throw new Error(REGISTRY_ERROR);
	},
});

export function createEmptySessionRegistries(): SessionRegistries {
	return {
		actions: createRegistryStub(),
		buildings: createRegistryStub(),
		developments: createRegistryStub(),
	};
}

export function createEmptySessionView(): ReturnType<typeof selectSessionView> {
	return {
		list: [],
		byId: new Map(),
		active: undefined,
		opponent: undefined,
		actions: new Map(),
		actionList: [],
		actionsByPlayer: new Map(),
		buildings: new Map(),
		buildingList: [],
		developments: new Map(),
		developmentList: [],
	};
}
