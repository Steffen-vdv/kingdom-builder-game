import type {
	PlayerId,
	PlayerStateSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import {
	createPassiveRecord,
	createSessionSnapshot,
	createSnapshotPlayer,
	createTestPhaseSequence,
	createTestRuleSnapshot,
	createTestSessionMetadata,
} from './sessionFixtures';
import {
	createPassiveGame,
	type PassiveGameContext,
} from './createPassiveDisplayGame';
import { createSessionRegistries } from './sessionRegistries';

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

interface ScenarioConfig {
	sessionRegistries: ReturnType<typeof createSessionRegistries>;
	phases: ReturnType<typeof createTestPhaseSequence>;
	ruleSnapshot: RuleSnapshot;
	metadata: ReturnType<typeof createTestSessionMetadata>;
}

function createScenarioConfig(): ScenarioConfig {
	const sessionRegistries = createSessionRegistries();
	const phases = createTestPhaseSequence();
	const baseRuleSnapshot = createTestRuleSnapshot(sessionRegistries.resources);
	const ruleSnapshot: RuleSnapshot = {
		...baseRuleSnapshot,
		tierDefinitions: baseRuleSnapshot.tierDefinitions.map((tier) => ({
			...tier,
			display: {
				...(tier.display ?? {}),
				title: `Snapshot ${tier.id}`,
			},
		})),
	};
	const metadata = createTestSessionMetadata(sessionRegistries, phases);
	return { sessionRegistries, phases, ruleSnapshot, metadata };
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
	const { ruleSnapshot, metadata, phases } = createScenarioConfig();
	const happinessKey = ruleSnapshot.tieredResourceKey;
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
		actionCostResource: happinessKey,
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
	const { ruleSnapshot, metadata, phases } = createScenarioConfig();
	const happinessKey = ruleSnapshot.tieredResourceKey;
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
		actionCostResource: happinessKey,
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
	const { sessionRegistries, phases, ruleSnapshot, metadata } =
		createScenarioConfig();
	const happinessKey = ruleSnapshot.tieredResourceKey;
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const buildingId = 'castle_walls';
	const buildingInfo = sessionRegistries.buildings.get(buildingId);
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
		actionCostResource: happinessKey,
		ruleSnapshot,
		passiveRecords: {
			[activePlayerId]: [passiveRecord],
			[opponentId]: [],
		},
		metadata,
	});
	return { ...createPassiveGame(sessionState, { ruleSnapshot }), activePlayer };
}
