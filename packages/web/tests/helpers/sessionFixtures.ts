import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	PlayerStartConfig,
	SessionLandSnapshot,
	SessionOverviewMetadata,
	SessionPassiveRecordSnapshot,
	SessionPhaseDefinition,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

export const createEmptySnapshotMetadata = (
	overrides: Partial<SessionSnapshotMetadata> = {},
): SessionSnapshotMetadata => {
	const { assets: assetOverrides, ...metadataOverrides } = overrides;
	const baseAssets: NonNullable<SessionSnapshotMetadata['assets']> = {
		land: { label: 'Land' },
		slot: { label: 'Development Slot' },
		passive: { label: 'Passive' },
		population: { label: 'Population' },
		transfer: { label: 'Transfer' },
		upkeep: { label: 'Upkeep' },
	};
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources: {},
		populations: {},
		buildings: {},
		developments: {},
		stats: {},
		phases: {},
		triggers: {},
		assets: assetOverrides ? { ...baseAssets, ...assetOverrides } : baseAssets,
		...metadataOverrides,
	};
	return metadata;
};

interface SnapshotPlayerOptions {
	id: SessionPlayerId;
	name?: string;
	aiControlled?: boolean;
	values?: SessionPlayerStateSnapshot['values'];
	resources?: Record<string, number>;
	stats?: Record<string, number>;
	statsHistory?: Record<string, boolean>;
	population?: Record<string, number>;
	lands?: SessionLandSnapshot[];
	buildings?: string[];
	actions?: string[];
	statSources?: SessionPlayerStateSnapshot['statSources'];
	skipPhases?: SessionPlayerStateSnapshot['skipPhases'];
	skipSteps?: SessionPlayerStateSnapshot['skipSteps'];
	passives?: SessionPlayerStateSnapshot['passives'];
}

function cloneStatSources(
	statSources: SessionPlayerStateSnapshot['statSources'],
): SessionPlayerStateSnapshot['statSources'] {
	const cloneSources: SessionPlayerStateSnapshot['statSources'] = {};
	for (const [statId, contributions] of Object.entries(statSources)) {
		const clonedContributions: Record<
			string,
			{ amount: number; meta: unknown }
		> = {};
		for (const [sourceId, entry] of Object.entries(contributions)) {
			clonedContributions[sourceId] = {
				amount: entry.amount,
				meta: clone(entry.meta),
			};
		}
		cloneSources[statId] = clonedContributions;
	}
	return cloneSources;
}

function cloneSkipPhases(
	skipPhases: SessionPlayerStateSnapshot['skipPhases'],
): SessionPlayerStateSnapshot['skipPhases'] {
	const cloned: SessionPlayerStateSnapshot['skipPhases'] = {};
	for (const [phaseId, sources] of Object.entries(skipPhases)) {
		cloned[phaseId] = { ...sources };
	}
	return cloned;
}

function cloneSkipSteps(
	skipSteps: SessionPlayerStateSnapshot['skipSteps'],
): SessionPlayerStateSnapshot['skipSteps'] {
	const cloned: SessionPlayerStateSnapshot['skipSteps'] = {};
	for (const [phaseId, stepMap] of Object.entries(skipSteps)) {
		const clonedStepMap: Record<string, Record<string, true>> = {};
		for (const [stepId, sources] of Object.entries(stepMap)) {
			clonedStepMap[stepId] = { ...sources };
		}
		cloned[phaseId] = clonedStepMap;
	}
	return cloned;
}

function cloneLands(lands: SessionLandSnapshot[]): SessionLandSnapshot[] {
	return lands.map((land) => ({
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
}

function clonePassives(
	passives: SessionPlayerStateSnapshot['passives'],
): SessionPlayerStateSnapshot['passives'] {
	return passives.map((passive) => ({
		...passive,
		meta: passive.meta ? { ...passive.meta } : undefined,
	}));
}

export function createSnapshotPlayer({
	id,
	name = `Player ${id}`,
	aiControlled,
	values,
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
}: SnapshotPlayerOptions): SessionPlayerStateSnapshot {
	const snapshot: SessionPlayerStateSnapshot = {
		id,
		name,
		values: clone(values ?? ({} as SessionPlayerStateSnapshot['values'])),
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
	if (aiControlled !== undefined) {
		snapshot.aiControlled = aiControlled;
	}
	return snapshot;
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

function cloneEffects(
	effects: EffectDef[] | undefined,
): EffectDef[] | undefined {
	return effects ? effects.map((effect) => ({ ...effect })) : undefined;
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
		record.meta = clone(meta);
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
	phases: SessionPhaseDefinition[];
	actionCostResource: SessionSnapshot['actionCostResource'];
	ruleSnapshot: SessionRuleSnapshot;
	passiveRecords?: Partial<
		Record<SessionPlayerId, SessionPassiveRecordSnapshot[]>
	>;
	compensations?: Partial<Record<SessionPlayerId, PlayerStartConfig>>;
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
	const normalizedCompensations: Record<SessionPlayerId, PlayerStartConfig> = {
		A: {},
		B: {},
	} as Record<SessionPlayerId, PlayerStartConfig>;
	for (const player of players) {
		normalizedCompensations[player.id] = clone(
			compensations[player.id] ?? ({} as PlayerStartConfig),
		);
	}
	const normalizedPassiveRecords: Record<
		SessionPlayerId,
		SessionPassiveRecordSnapshot[]
	> = { A: [], B: [] } as Record<
		SessionPlayerId,
		SessionPassiveRecordSnapshot[]
	>;
	for (const player of players) {
		const records = passiveRecords[player.id] ?? [];
		normalizedPassiveRecords[player.id] = records.map((record) => ({
			...record,
		}));
	}
	const metadata = metadataOverride
		? clone(metadataOverride)
		: createEmptySnapshotMetadata({
				overview: {
					hero: { title: 'Session Overview', tokens: {} },
					sections: [],
					tokens: {},
				} satisfies SessionOverviewMetadata,
			});
	return {
		game: {
			turn,
			currentPlayerIndex: activeIndex === -1 ? 0 : activeIndex,
			currentPhase: resolvedCurrentPhase,
			currentStep: resolvedCurrentStep,
			phaseIndex,
			stepIndex,
			devMode,
			players: players.map((player) => ({ ...player })),
			activePlayerId,
			opponentId,
		},
		phases: phases.map((phaseDefinition) => ({
			...phaseDefinition,
			...(phaseDefinition.steps
				? {
						steps: phaseDefinition.steps.map((step) => ({
							...step,
							effects: step.effects
								? step.effects.map((effect) => ({ ...effect }))
								: undefined,
						})),
					}
				: {}),
		})),
		actionCostResource,
		recentResourceGains: recentResourceGains.map((gain) => ({ ...gain })),
		compensations: normalizedCompensations,
		rules: clone(ruleSnapshot),
		passiveRecords: normalizedPassiveRecords,
		metadata,
	} satisfies SessionSnapshot;
}
