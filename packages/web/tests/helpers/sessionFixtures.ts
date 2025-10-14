import type { EffectDef, PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	SessionPassiveRecordSnapshot,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';

type PassiveRecordMeta = SessionPassiveRecordSnapshot['meta'];

type StatSourceMap = SessionPlayerStateSnapshot['statSources'];

type SkipPhaseMap = SessionPlayerStateSnapshot['skipPhases'];

type SkipStepMap = SessionPlayerStateSnapshot['skipSteps'];

interface SnapshotPlayerOptions {
	id: SessionPlayerId;
	name?: string;
	resources?: Record<string, number>;
	stats?: Record<string, number>;
	statsHistory?: Record<string, boolean>;
	population?: Record<string, number>;
	lands?: SessionPlayerStateSnapshot['lands'];
	buildings?: string[];
	actions?: string[];
	statSources?: StatSourceMap;
	skipPhases?: SkipPhaseMap;
	skipSteps?: SkipStepMap;
	passives?: SessionPlayerStateSnapshot['passives'];
	aiControlled?: boolean;
}

const cloneStatSources = (sources: StatSourceMap = {}): StatSourceMap => {
	const cloned: StatSourceMap = {};
	for (const [statId, contributions] of Object.entries(sources)) {
		const clone: StatSourceMap[string] = {};
		for (const [sourceId, entry] of Object.entries(contributions)) {
			clone[sourceId] = { amount: entry.amount, meta: { ...entry.meta } };
		}
		cloned[statId] = clone;
	}
	return cloned;
};

const cloneSkipPhases = (skipPhases: SkipPhaseMap = {}): SkipPhaseMap => {
	const cloned: SkipPhaseMap = {};
	for (const [phaseId, sources] of Object.entries(skipPhases)) {
		cloned[phaseId] = { ...sources };
	}
	return cloned;
};

const cloneSkipSteps = (skipSteps: SkipStepMap = {}): SkipStepMap => {
	const cloned: SkipStepMap = {};
	for (const [phaseId, stepMap] of Object.entries(skipSteps)) {
		const steps: SkipStepMap[string] = {};
		for (const [stepId, stepSources] of Object.entries(stepMap)) {
			steps[stepId] = { ...stepSources };
		}
		cloned[phaseId] = steps;
	}
	return cloned;
};

const clonePassives = (
	passives: SessionPlayerStateSnapshot['passives'] = [],
): SessionPlayerStateSnapshot['passives'] =>
	passives.map((passive) => ({
		...passive,
		meta: passive.meta ? { ...passive.meta } : undefined,
	}));

const cloneLands = (
	lands: SessionPlayerStateSnapshot['lands'] = [],
): SessionPlayerStateSnapshot['lands'] =>
	lands.map((land) => ({
		...land,
		developments: [...land.developments],
		upkeep: land.upkeep ? { ...land.upkeep } : undefined,
		onPayUpkeepStep: land.onPayUpkeepStep
			? land.onPayUpkeepStep.map((effect) => ({ ...effect }))
			: undefined,
		onGainIncomeStep: land.onGainIncomeStep
			? land.onGainIncomeStep.map((effect) => ({ ...effect }))
			: undefined,
		onGainAPStep: land.onGainAPStep
			? land.onGainAPStep.map((effect) => ({ ...effect }))
			: undefined,
	}));

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
	aiControlled,
}: SnapshotPlayerOptions): SessionPlayerStateSnapshot {
	return {
		id,
		name,
		aiControlled,
		resources: { ...resources },
		stats: { ...stats },
		statsHistory: { ...statsHistory },
		population: { ...population },
		lands: cloneLands(lands),
		buildings: [...buildings],
		actions: [...actions],
		statSources: cloneStatSources(statSources),
		skipPhases: cloneSkipPhases(skipPhases),
		skipSteps: cloneSkipSteps(skipSteps),
		passives: clonePassives(passives),
	};
}

interface PassiveRecordOptions {
	id: string;
	owner: SessionPlayerId;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: PassiveRecordMeta;
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
}

const cloneEffects = (effects?: EffectDef[]): EffectDef[] | undefined =>
	effects ? effects.map((effect) => ({ ...effect })) : undefined;

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
}: PassiveRecordOptions): SessionPassiveRecordSnapshot {
	const record: SessionPassiveRecordSnapshot = {
		id,
		owner,
	} as SessionPassiveRecordSnapshot;
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
		record.meta = { ...meta } as PassiveRecordMeta;
	}
	if (effects) {
		record.effects = cloneEffects(effects);
	}
	if (onGrowthPhase) {
		record.onGrowthPhase = cloneEffects(onGrowthPhase);
	}
	if (onUpkeepPhase) {
		record.onUpkeepPhase = cloneEffects(onUpkeepPhase);
	}
	if (onBeforeAttacked) {
		record.onBeforeAttacked = cloneEffects(onBeforeAttacked);
	}
	if (onAttackResolved) {
		record.onAttackResolved = cloneEffects(onAttackResolved);
	}
	return record;
}

interface SessionSnapshotOptions {
	players: SessionPlayerStateSnapshot[];
	activePlayerId: SessionPlayerId;
	opponentId: SessionPlayerId;
	phases: SessionSnapshot['phases'];
	actionCostResource: SessionSnapshot['actionCostResource'];
	ruleSnapshot: SessionRuleSnapshot;
	passiveRecords?: Record<SessionPlayerId, SessionPassiveRecordSnapshot[]>;
	compensations?: Record<SessionPlayerId, PlayerStartConfig>;
	recentResourceGains?: SessionSnapshot['recentResourceGains'];
	turn?: number;
	currentPhase?: string;
	currentStep?: string;
	phaseIndex?: number;
	stepIndex?: number;
	devMode?: boolean;
	metadata?: SessionSnapshot['metadata'];
}

const cloneRecentResourceGains = (
	gains: SessionSnapshot['recentResourceGains'] = [],
): SessionSnapshot['recentResourceGains'] => gains.map((gain) => ({ ...gain }));

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
}: SessionSnapshotOptions): SessionSnapshot {
	const phase = phases[phaseIndex] ?? phases[0];
	const resolvedCurrentPhase =
		currentPhase ?? phase?.id ?? phases[0]?.id ?? 'phase-0';
	const resolvedCurrentStep =
		currentStep ?? phase?.steps?.[stepIndex]?.id ?? resolvedCurrentPhase;
	const activeIndex = players.findIndex(
		(player) => player.id === activePlayerId,
	);
	const opponentIndex = players.findIndex((player) => player.id === opponentId);
	const normalizedCompensations: Record<SessionPlayerId, PlayerStartConfig> =
		{} as Record<SessionPlayerId, PlayerStartConfig>;
	const normalizedPassiveRecords: Record<
		SessionPlayerId,
		SessionPassiveRecordSnapshot[]
	> = {} as Record<SessionPlayerId, SessionPassiveRecordSnapshot[]>;
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
			players: players.map((player) => createSnapshotPlayer(player)),
			activePlayerId,
			opponentId:
				opponentIndex >= 0 ? opponentId : (players[0]?.id ?? activePlayerId),
		},
		phases: phases.map((phaseDef) => ({
			...phaseDef,
			steps: phaseDef.steps.map((step) => ({ ...step })),
		})),
		actionCostResource,
		recentResourceGains: cloneRecentResourceGains(recentResourceGains),
		compensations: normalizedCompensations,
		rules: structuredClone(ruleSnapshot),
		passiveRecords: normalizedPassiveRecords,
		metadata,
	};
}
