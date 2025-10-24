import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	PlayerStartConfig,
	SessionLandSnapshot,
	SessionOverviewMetadata,
	SessionPassiveRecordSnapshot,
	SessionPhaseDefinition,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionMetadataDescriptor,
	SessionResourceBoundsV2,
	SessionResourceCatalogV2,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import {
	clone,
	cloneEffects,
	cloneLands,
	clonePassives,
	cloneResourceBoundsV2,
	cloneSkipPhases,
	cloneSkipSteps,
	cloneStatSources,
} from './sessionCloneUtils';

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
	valuesV2?: Record<string, number>;
	resourceBoundsV2?: Record<string, SessionResourceBoundsV2>;
}

export function createSnapshotPlayer({
	id,
	name = `Player ${id}`,
	aiControlled,
	resources = {},
	stats = {},
	statsHistory = {},
	population = {},
	lands = [] as SessionLandSnapshot[],
	buildings = [],
	actions = [],
	statSources = {},
	skipPhases = {},
	skipSteps = {},
	passives = [],
	valuesV2,
	resourceBoundsV2,
}: SnapshotPlayerOptions): SessionPlayerStateSnapshot {
	const snapshot: SessionPlayerStateSnapshot = {
		id,
		name,
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
	if (valuesV2) {
		snapshot.valuesV2 = { ...valuesV2 };
	}
	if (resourceBoundsV2) {
		snapshot.resourceBoundsV2 = cloneResourceBoundsV2(resourceBoundsV2);
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
	resourceCatalogV2?: SessionResourceCatalogV2;
	resourceMetadataV2?: Record<string, SessionMetadataDescriptor>;
	resourceGroupMetadataV2?: Record<string, SessionMetadataDescriptor>;
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
	resourceCatalogV2,
	resourceMetadataV2,
	resourceGroupMetadataV2,
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
	const snapshot: SessionSnapshot = {
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
	};
	if (resourceCatalogV2) {
		snapshot.game.resourceCatalogV2 = clone(resourceCatalogV2);
	}
	if (resourceMetadataV2) {
		snapshot.resourceMetadataV2 = clone(resourceMetadataV2);
	}
	if (resourceGroupMetadataV2) {
		snapshot.resourceGroupMetadataV2 = clone(resourceGroupMetadataV2);
	}
	return snapshot;
}
