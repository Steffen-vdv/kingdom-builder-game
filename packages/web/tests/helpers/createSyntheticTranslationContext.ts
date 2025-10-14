import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import type { TranslationContext } from '../../src/translation/context';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTestSessionScaffold } from './testSessionScaffold';
import { createSessionSnapshot, createSnapshotPlayer } from './sessionFixtures';
import { createTestRegistryMetadata } from './registryMetadata';
import type {
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';

export interface SyntheticTranslationContextResult {
	translationContext: TranslationContext;
	registries: SessionRegistries;
	session: SessionSnapshot;
	metadataSelectors: ReturnType<typeof createTestRegistryMetadata>;
}

export type SyntheticContextConfigurator = (options: {
	session: SessionSnapshot;
	registries: SessionRegistries;
	metadata: SessionSnapshotMetadata;
}) => void;

export function buildSyntheticTranslationContext(
	configure?: SyntheticContextConfigurator,
): SyntheticTranslationContextResult {
	const { registries, metadata, phases, ruleSnapshot } =
		createTestSessionScaffold();
	const resourceKeys = Object.keys(registries.resources);
	const baseResources = Object.fromEntries(resourceKeys.map((key) => [key, 0]));
	const actionCostResource =
		resourceKeys.find((key) => key === 'ap') ?? resourceKeys[0] ?? 'ap';
	const activePlayer = createSnapshotPlayer({
		id: 'A',
		name: 'Active Player',
		resources: { ...baseResources },
		population: {},
	});
	const opponent = createSnapshotPlayer({
		id: 'B',
		name: 'Opponent Player',
		resources: { ...baseResources },
		population: {},
	});
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases,
		actionCostResource,
		ruleSnapshot,
		metadata,
	});
	configure?.({ session, registries, metadata: session.metadata });
	const translationContext = createTranslationContext(
		session,
		registries,
		session.metadata,
		{
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		{
			resources: registries.resources,
			populations: registries.populations,
			buildings: registries.buildings,
			developments: registries.developments,
		},
		session.metadata,
	);
	return {
		translationContext,
		registries,
		session,
		metadataSelectors,
	};
}
