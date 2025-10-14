import type { EffectDef, PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	SessionPassiveRecordSnapshot,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionPhaseDefinition,
	SessionCreateResponse,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol/session';

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

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
	statSources?: SessionPlayerStateSnapshot['statSources'];
	skipPhases?: SessionPlayerStateSnapshot['skipPhases'];
	skipSteps?: SessionPlayerStateSnapshot['skipSteps'];
	passives?: SessionPlayerStateSnapshot['passives'];
	aiControlled?: boolean;
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
	aiControlled,
}: SnapshotPlayerOptions): SessionPlayerStateSnapshot {
	const clonedStatSources: SessionPlayerStateSnapshot['statSources'] = {};
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
	const clonedSkipPhases: SessionPlayerStateSnapshot['skipPhases'] = {};
	for (const [phaseId, sources] of Object.entries(skipPhases)) {
		clonedSkipPhases[phaseId] = { ...sources };
	}
	const clonedSkipSteps: SessionPlayerStateSnapshot['skipSteps'] = {};
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
		lands: lands.map((land) =>
			clone(land),
		) as SessionPlayerStateSnapshot['lands'],
		buildings: [...buildings],
		actions: [...actions],
		statSources: clonedStatSources,
		skipPhases: clonedSkipPhases,
		skipSteps: clonedSkipSteps,
		passives: passives.map((passive) => clone(passive)),
		...(aiControlled !== undefined ? { aiControlled } : {}),
	};
}

interface PassiveRecordOptions {
	id: string;
	owner: SessionPlayerId;
	name?: string;
	icon?: string;
	detail?: string;
	meta?: SessionPassiveRecordSnapshot['meta'];
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
}: PassiveRecordOptions): SessionPassiveRecordSnapshot {
	const record: SessionPassiveRecordSnapshot = { id, owner };
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
		record.meta = clone(meta);
	}
	if (effects) {
		record.effects = effects.map((effect) => clone(effect));
	}
	if (onGrowthPhase) {
		record.onGrowthPhase = onGrowthPhase.map((effect) => clone(effect));
	}
	if (onUpkeepPhase) {
		record.onUpkeepPhase = onUpkeepPhase.map((effect) => clone(effect));
	}
	if (onBeforeAttacked) {
		record.onBeforeAttacked = onBeforeAttacked.map((effect) => clone(effect));
	}
	if (onAttackResolved) {
		record.onAttackResolved = onAttackResolved.map((effect) => clone(effect));
	}
	return record;
}

interface SessionSnapshotOptions {
	players: SessionPlayerStateSnapshot[];
	activePlayerId: SessionPlayerId;
	opponentId: SessionPlayerId;
	phases: SessionPhaseDefinition[];
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
	metadata?: SessionSnapshotMetadata;
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
		normalizedCompensations[player.id] = clone(
			(compensations[player.id] ?? {}) as PlayerStartConfig,
		);
		normalizedPassiveRecords[player.id] = (passiveRecords[player.id] ?? []).map(
			(record) => clone(record),
		);
	}
	const metadata = metadataOverride
		? clone(metadataOverride)
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
			players: players.map((player) => clone(player)),
			activePlayerId,
			opponentId:
				opponentIndex >= 0 ? opponentId : (players[0]?.id ?? activePlayerId),
		},
		phases,
		actionCostResource,
		recentResourceGains: recentResourceGains.map((gain) => clone(gain)),
		compensations: normalizedCompensations,
		rules: ruleSnapshot,
		passiveRecords: normalizedPassiveRecords,
		metadata,
	};
}

interface CreateSessionResponseOptions {
	sessionId: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistriesPayload;
}

export function createSessionCreateResponse({
	sessionId,
	snapshot,
	registries,
}: CreateSessionResponseOptions): SessionCreateResponse {
	return {
		sessionId,
		snapshot: clone(snapshot),
		registries: clone(registries),
	};
}

export type { SessionSnapshotOptions };
