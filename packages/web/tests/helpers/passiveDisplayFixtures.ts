import type {
	PlayerId,
	PlayerStateSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import {
	createPassiveRecord,
	createSessionSnapshot,
	createSnapshotPlayer,
	createTestPhases,
	createTestRuleSnapshot,
	createTestSessionMetadata,
} from './sessionFixtures';
import {
	createPassiveGame,
	type PassiveGameContext,
} from './createPassiveDisplayGame';
import { createSessionRegistries } from './sessionRegistries';
import type { SessionRegistries } from '../../src/state/sessionRegistries';

export type TierPassiveScenario = PassiveGameContext & {
	activePlayer: PlayerStateSnapshot;
	ruleSnapshot: RuleSnapshot;
};

export type NeutralPassiveScenario = PassiveGameContext & {
	activePlayer: PlayerStateSnapshot;
};

export type BuildingPassiveScenario = PassiveGameContext & {
	activePlayer: PlayerStateSnapshot;
};

const ensureRuleTitles = (ruleSnapshot: RuleSnapshot): RuleSnapshot => ({
	...ruleSnapshot,
	tierDefinitions: ruleSnapshot.tierDefinitions.map((tier) => ({
		...tier,
		display: {
			...(tier.display ?? {}),
			title: tier.display?.title ?? `Snapshot ${tier.id}`,
		},
	})),
});

function createScenarioContext(): {
	registries: SessionRegistries;
	phases: ReturnType<typeof createTestPhases>;
	ruleSnapshot: RuleSnapshot;
	metadata: ReturnType<typeof createTestSessionMetadata>;
	happinessKey: string;
} {
	const registries = createSessionRegistries();
	const phases = createTestPhases();
	const resourceKeys = Object.keys(registries.resources);
	const happinessKey = resourceKeys[0] ?? 'resource:auric-light';
	const ruleSnapshot = ensureRuleTitles(createTestRuleSnapshot(happinessKey));
	const metadata = createTestSessionMetadata(registries, phases);
	return { registries, phases, ruleSnapshot, metadata, happinessKey };
}

function sampleValueForTier(
	tier: RuleSnapshot['tierDefinitions'][number],
): number {
	const min = tier.range.min ?? 0;
	const max = tier.range.max;
	if (max !== undefined && max >= min) {
		return min;
	}
	return min;
}

export function createTierPassiveScenario(): TierPassiveScenario {
	const { phases, ruleSnapshot, metadata, happinessKey } =
		createScenarioContext();
	const tier = ruleSnapshot.tierDefinitions.find(
		(entry) => entry.preview?.id && (entry.range.min ?? 0) >= 0,
	);
	if (!tier?.preview?.id) {
		throw new Error('Unable to locate a happiness tier with a passive.');
	}
	const removalDetail =
		tier.display?.removalCondition ??
		tier.text?.removal ??
		'the current happiness threshold holds';
	const passiveMeta = {
		source: {
			type: 'tier',
			id: tier.id,
			icon: tier.display?.icon,
			labelToken: tier.display?.summaryToken,
			name: tier.display?.title,
		},
		removal: {
			token: removalDetail,
		},
	};
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: { [happinessKey]: sampleValueForTier(tier) },
		passives: [
			{
				id: tier.preview.id,
				name: tier.display?.title,
				icon: tier.display?.icon,
				detail: tier.text?.summary,
				meta: passiveMeta,
			},
		],
	});
	const opponent = createSnapshotPlayer({
		id: opponentId,
		name: 'Player Two',
	});
	const passiveRecord = createPassiveRecord({
		id: tier.preview.id,
		owner: activePlayerId,
		name: tier.display?.title,
		icon: tier.display?.icon,
		detail: tier.text?.summary,
		meta: passiveMeta,
		effects: tier.preview.effects,
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId,
		opponentId,
		phases,
		actionCostResource: ruleSnapshot.tieredResourceKey,
		ruleSnapshot,
		passiveRecords: {
			[activePlayerId]: [passiveRecord],
			[opponentId]: [],
		},
		metadata,
	});
	const context = createPassiveGame(sessionState, { ruleSnapshot });
	return { ...context, activePlayer, ruleSnapshot };
}

export function createNeutralScenario(): NeutralPassiveScenario {
	const { phases, ruleSnapshot, metadata, happinessKey } =
		createScenarioContext();
	const neutralTier = ruleSnapshot.tierDefinitions.find(
		(entry) => !entry.preview?.id,
	);
	if (!neutralTier) {
		throw new Error('No neutral tier definition available.');
	}
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: { [happinessKey]: sampleValueForTier(neutralTier) },
	});
	const opponent = createSnapshotPlayer({
		id: opponentId,
		name: 'Player Two',
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId,
		opponentId,
		phases,
		actionCostResource: ruleSnapshot.tieredResourceKey,
		ruleSnapshot,
		passiveRecords: {
			[activePlayerId]: [],
			[opponentId]: [],
		},
		metadata,
	});
	return { ...createPassiveGame(sessionState, { ruleSnapshot }), activePlayer };
}

export function createBuildingScenario(): BuildingPassiveScenario {
	const { registries, phases, ruleSnapshot, metadata, happinessKey } =
		createScenarioContext();
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const buildingEntry = registries.buildings.entries()[0];
	if (!buildingEntry) {
		throw new Error('No building definition available for scenario.');
	}
	const [buildingId, buildingInfo] = buildingEntry;
	const passiveId = `${buildingId}_bonus`;
	const passiveMeta = {
		source: {
			type: 'building',
			id: buildingId,
			icon: buildingInfo?.icon,
			name: buildingInfo?.name,
		},
	};
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: { [happinessKey]: 0 },
		passives: [
			{
				id: passiveId,
				meta: passiveMeta,
			},
		],
		buildings: [buildingId],
	});
	const opponent = createSnapshotPlayer({
		id: opponentId,
		name: 'Player Two',
	});
	const passiveRecord = createPassiveRecord({
		id: passiveId,
		owner: activePlayerId,
		meta: passiveMeta,
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId,
		opponentId,
		phases,
		actionCostResource: ruleSnapshot.tieredResourceKey,
		ruleSnapshot,
		passiveRecords: {
			[activePlayerId]: [passiveRecord],
			[opponentId]: [],
		},
		metadata,
	});
	return { ...createPassiveGame(sessionState, { ruleSnapshot }), activePlayer };
}
