import type {
	PlayerId,
	PlayerStateSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import {
	BUILDINGS,
	PHASES,
	RULES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import {
	createPassiveRecord,
	createSessionSnapshot,
	createSnapshotPlayer,
} from './sessionFixtures';
import {
	createPassiveGame,
	type PassiveGameContext,
} from './createPassiveDisplayGame';

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

const happinessKey = RULES.tieredResourceKey as ResourceKey;

function cloneRuleSnapshot(): RuleSnapshot {
	return {
		...RULES,
		tierDefinitions: RULES.tierDefinitions.map((tier) => ({
			...tier,
			display: {
				...(tier.display ?? {}),
				title: `Snapshot ${tier.id}`,
			},
		})),
	};
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
	const ruleSnapshot = cloneRuleSnapshot();
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
		phases: PHASES,
		actionCostResource: RULES.tieredResourceKey as ResourceKey,
		ruleSnapshot,
		passiveRecords: {
			[activePlayerId]: [passiveRecord],
			[opponentId]: [],
		},
	});
	const context = createPassiveGame(sessionState, { ruleSnapshot });
	return { ...context, activePlayer, ruleSnapshot };
}

export function createNeutralScenario(): NeutralPassiveScenario {
	const ruleSnapshot = cloneRuleSnapshot();
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
		phases: PHASES,
		actionCostResource: RULES.tieredResourceKey as ResourceKey,
		ruleSnapshot,
		passiveRecords: {
			[activePlayerId]: [],
			[opponentId]: [],
		},
	});
	return { ...createPassiveGame(sessionState, { ruleSnapshot }), activePlayer };
}

export function createBuildingScenario(): BuildingPassiveScenario {
	const ruleSnapshot = cloneRuleSnapshot();
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const buildingId = 'castle_walls';
	const buildingInfo = BUILDINGS.get(buildingId);
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
		phases: PHASES,
		actionCostResource: RULES.tieredResourceKey as ResourceKey,
		ruleSnapshot,
		passiveRecords: {
			[activePlayerId]: [passiveRecord],
			[opponentId]: [],
		},
	});
	return { ...createPassiveGame(sessionState, { ruleSnapshot }), activePlayer };
}
