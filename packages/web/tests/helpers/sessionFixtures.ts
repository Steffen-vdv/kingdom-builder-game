import type {
	EffectDef,
	EngineSessionSnapshot,
	PassiveRecordSnapshot,
	PlayerId,
	PlayerStateSnapshot,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';

interface SnapshotPlayerOptions {
	id: PlayerId;
	name?: string;
	resources?: Record<string, number>;
	stats?: Record<string, number>;
	statsHistory?: Record<string, boolean>;
	population?: Record<string, number>;
	lands?: PlayerStateSnapshot['lands'];
	buildings?: string[];
	actions?: string[];
	statSources?: PlayerStateSnapshot['statSources'];
	skipPhases?: PlayerStateSnapshot['skipPhases'];
	skipSteps?: PlayerStateSnapshot['skipSteps'];
	passives?: PlayerStateSnapshot['passives'];
}

export function createSnapshotPlayer({
	id,
	name = `Player ${id}`,
	resources = {},
	stats = {},
	statsHistory = {},
	population = {},
	lands = [],
	buildings = [],
	actions = [],
	statSources = {},
	skipPhases = {},
	skipSteps = {},
	passives = [],
}: SnapshotPlayerOptions): PlayerStateSnapshot {
	const clonedStatSources: PlayerStateSnapshot['statSources'] = {};
	for (const [statId, contributions] of Object.entries(statSources)) {
		const clonedContributions: Record<
			string,
			{ amount: number; meta: unknown }
		> = {};
		for (const [sourceId, entry] of Object.entries(contributions)) {
			clonedContributions[sourceId] = {
				amount: entry.amount,
				meta: entry.meta,
			};
		}
		clonedStatSources[statId] = clonedContributions;
	}
	const clonedSkipPhases: PlayerStateSnapshot['skipPhases'] = {};
	for (const [phaseId, sources] of Object.entries(skipPhases)) {
		clonedSkipPhases[phaseId] = { ...sources };
	}
	const clonedSkipSteps: PlayerStateSnapshot['skipSteps'] = {};
	for (const [phaseId, stepMap] of Object.entries(skipSteps)) {
		const clonedStepMap: Record<string, Record<string, true>> = {};
		for (const [stepId, stepSources] of Object.entries(stepMap)) {
			clonedStepMap[stepId] = { ...stepSources };
		}
		clonedSkipSteps[phaseId] = clonedStepMap;
	}
	return {
		id,
		name,
		resources: { ...resources },
		stats: { ...stats },
		statsHistory: { ...statsHistory },
		population: { ...population },
		lands: lands.map((land) => ({
			...land,
			developments: [...land.developments],
			slots: land.slots.map((slot) => ({ ...slot })),
		})),
		buildings: [...buildings],
		actions: [...actions],
		statSources: clonedStatSources,
		skipPhases: clonedSkipPhases,
		skipSteps: clonedSkipSteps,
		passives: passives.map((passive) => ({
			...passive,
			meta: passive.meta ? { ...passive.meta } : undefined,
		})),
	};
}

interface PassiveRecordOptions {
	id: string;
	owner: PlayerId;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: PassiveRecordSnapshot['meta'];
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
}

export function createPassiveRecord({
	id,
	owner,
	name,
	icon,
	detail,
	meta,
	effects,
	onGrowthPhase,
	onUpkeepPhase,
	onBeforeAttacked,
	onAttackResolved,
}: PassiveRecordOptions): PassiveRecordSnapshot {
	const record: PassiveRecordSnapshot = {
		id,
		owner,
	} as PassiveRecordSnapshot;
	if (name !== undefined) {
		record.name = name;
	}
	if (icon !== undefined) {
		record.icon = icon;
	}
	if (detail !== undefined) {
		record.detail = detail;
	}
	if (meta !== undefined) {
		record.meta = { ...meta };
	}
	if (effects) {
		record.effects = effects.map((effect) => ({ ...effect }));
	}
	if (onGrowthPhase) {
		record.onGrowthPhase = onGrowthPhase.map((effect) => ({ ...effect }));
	}
	if (onUpkeepPhase) {
		record.onUpkeepPhase = onUpkeepPhase.map((effect) => ({ ...effect }));
	}
	if (onBeforeAttacked) {
		record.onBeforeAttacked = onBeforeAttacked.map((effect) => ({ ...effect }));
	}
	if (onAttackResolved) {
		record.onAttackResolved = onAttackResolved.map((effect) => ({ ...effect }));
	}
	return record;
}

interface SessionSnapshotOptions {
	players: PlayerStateSnapshot[];
	activePlayerId: PlayerId;
	opponentId: PlayerId;
	phases: EngineSessionSnapshot['phases'];
	actionCostResource: EngineSessionSnapshot['actionCostResource'];
	ruleSnapshot: RuleSnapshot;
	passiveRecords?: Record<PlayerId, PassiveRecordSnapshot[]>;
	compensations?: Record<PlayerId, PlayerStartConfig>;
	recentResourceGains?: EngineSessionSnapshot['recentResourceGains'];
	turn?: number;
	currentPhase?: string;
	currentStep?: string;
	phaseIndex?: number;
	stepIndex?: number;
	devMode?: boolean;
	metadata?: EngineSessionSnapshot['metadata'];
}

export function createSessionSnapshot({
	players,
	activePlayerId,
	opponentId,
	phases,
	actionCostResource,
	ruleSnapshot,
	passiveRecords = {},
	compensations = {},
	recentResourceGains = [],
	turn = 1,
	currentPhase,
	currentStep,
	phaseIndex = 0,
	stepIndex = 0,
	devMode = false,
	metadata: metadataOverride,
}: SessionSnapshotOptions): EngineSessionSnapshot {
	const phase = phases[phaseIndex] ?? phases[0];
	const resolvedCurrentPhase =
		currentPhase ?? phase?.id ?? phases[0]?.id ?? 'phase-0';
	const resolvedCurrentStep =
		currentStep ?? phase?.steps?.[stepIndex]?.id ?? resolvedCurrentPhase;
	const activeIndex = players.findIndex(
		(player) => player.id === activePlayerId,
	);
	const opponentIndex = players.findIndex((player) => player.id === opponentId);
	const normalizedCompensations: Record<PlayerId, PlayerStartConfig> =
		{} as Record<PlayerId, PlayerStartConfig>;
	const normalizedPassiveRecords: Record<PlayerId, PassiveRecordSnapshot[]> =
		{} as Record<PlayerId, PassiveRecordSnapshot[]>;
	for (const player of players) {
		normalizedCompensations[player.id] = {
			...(compensations[player.id] ?? {}),
		} as PlayerStartConfig;
		normalizedPassiveRecords[player.id] = (passiveRecords[player.id] ?? []).map(
			(record) => ({ ...record }),
		);
	}
	const metadata = metadataOverride
		? structuredClone(metadataOverride)
		: { passiveEvaluationModifiers: {} };
	return {
		game: {
			turn,
			currentPlayerIndex: activeIndex >= 0 ? activeIndex : 0,
			currentPhase: resolvedCurrentPhase,
			currentStep: resolvedCurrentStep,
			phaseIndex,
			stepIndex,
			devMode,
			players,
			activePlayerId,
			opponentId:
				opponentIndex >= 0 ? opponentId : (players[0]?.id ?? activePlayerId),
		},
		phases,
		actionCostResource,
		recentResourceGains: recentResourceGains.map((gain) => ({
			...gain,
		})),
		compensations: normalizedCompensations,
		rules: ruleSnapshot,
		passiveRecords: normalizedPassiveRecords,
		metadata,
	};
}
