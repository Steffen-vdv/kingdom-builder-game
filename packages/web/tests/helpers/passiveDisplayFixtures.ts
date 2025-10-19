import type {
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
} from '@kingdom-builder/protocol';
import {
	createPassiveRecord,
	createSessionSnapshot,
	createSnapshotPlayer,
} from './sessionFixtures';
import {
	createPassiveGame,
	type PassiveGameContext,
} from './createPassiveDisplayGame';
import { createTestSessionScaffold } from './testSessionScaffold';

export type TierPassiveScenario = PassiveGameContext & {
	activePlayer: SessionPlayerStateSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
};

export type NeutralPassiveScenario = PassiveGameContext & {
	activePlayer: SessionPlayerStateSnapshot;
};

export type BuildingPassiveScenario = PassiveGameContext & {
	activePlayer: SessionPlayerStateSnapshot;
};

function cloneRuleSnapshot(base: SessionRuleSnapshot): SessionRuleSnapshot {
	const clone = structuredClone(base);
	clone.tierDefinitions = clone.tierDefinitions.map((tier) => ({
		...tier,
		display: {
			...(tier.display ?? {}),
			title: `Snapshot ${tier.id}`,
		},
	}));
	return clone;
}

function sampleValueForTier(
	tier: SessionRuleSnapshot['tierDefinitions'][number],
): number {
	const min = tier.range.min ?? 0;
	const max = tier.range.max;
	if (max !== undefined && max >= min) {
		return min;
	}
	return min;
}

export function createTierPassiveScenario(): TierPassiveScenario {
	const {
		registries,
		metadata,
		phases,
		ruleSnapshot: baseRuleSnapshot,
	} = createTestSessionScaffold();
	const ruleSnapshot = cloneRuleSnapshot(baseRuleSnapshot);
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
	const activePlayerId = 'player-1' as SessionPlayerId;
	const opponentId = 'player-2' as SessionPlayerId;
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
		metadata,
		passiveRecords: {
			[activePlayerId]: [passiveRecord],
			[opponentId]: [],
		},
	});
	const context = createPassiveGame(sessionState, {
		ruleSnapshot,
		registries,
		metadata: sessionState.metadata,
	});
	return { ...context, activePlayer, ruleSnapshot };
}

export function createNeutralScenario(): NeutralPassiveScenario {
	const {
		registries,
		metadata,
		phases,
		ruleSnapshot: baseRuleSnapshot,
	} = createTestSessionScaffold();
	const ruleSnapshot = cloneRuleSnapshot(baseRuleSnapshot);
	const happinessKey = ruleSnapshot.tieredResourceKey;
	const neutralTier = ruleSnapshot.tierDefinitions.find(
		(entry) => !entry.preview?.id,
	);
	if (!neutralTier) {
		throw new Error('No neutral tier definition available.');
	}
	const activePlayerId = 'player-1' as SessionPlayerId;
	const opponentId = 'player-2' as SessionPlayerId;
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
		metadata,
		passiveRecords: {
			[activePlayerId]: [],
			[opponentId]: [],
		},
	});
	const context = createPassiveGame(sessionState, {
		ruleSnapshot,
		registries,
		metadata: sessionState.metadata,
	});
	return { ...context, activePlayer };
}

export function createBuildingScenario(): BuildingPassiveScenario {
	const {
		registries,
		metadata,
		phases,
		ruleSnapshot: baseRuleSnapshot,
	} = createTestSessionScaffold();
	const ruleSnapshot = cloneRuleSnapshot(baseRuleSnapshot);
	const happinessKey = ruleSnapshot.tieredResourceKey;
	const activePlayerId = 'player-1' as SessionPlayerId;
	const opponentId = 'player-2' as SessionPlayerId;
	const buildingId = 'castle_walls';
	const buildingInfo = registries.buildings.get(buildingId);
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
		metadata,
		passiveRecords: {
			[activePlayerId]: [passiveRecord],
			[opponentId]: [],
		},
	});
	const context = createPassiveGame(sessionState, {
		ruleSnapshot,
		registries,
		metadata: sessionState.metadata,
	});
	return { ...context, activePlayer };
}
