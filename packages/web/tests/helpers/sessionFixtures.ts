import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	PlayerStartConfig,
	SessionOverviewMetadata,
	SessionPassiveRecordSnapshot,
	SessionPhaseDefinition,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionResourceBoundsV2,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionResourceCatalogV2,
} from '@kingdom-builder/protocol/session';
import {
	clone,
	cloneLands,
	clonePassives,
	cloneSkipPhases,
	cloneSkipSteps,
	cloneStatSources,
} from './sessionCloneHelpers';

const EMPTY_RESOURCE_CATALOG_V2: SessionResourceCatalogV2 = Object.freeze({
	resources: { byId: {}, ordered: [] },
	groups: { byId: {}, ordered: [] },
});

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
	resourceTouchedV2?: Record<string, boolean>;
	population?: Record<string, number>;
	valuesV2?: Record<string, number>;
	resourceBoundsV2?: Record<string, Partial<SessionResourceBoundsV2>>;
	lands?: SessionPlayerStateSnapshot['lands'];
	buildings?: string[];
	actions?: string[];
	statSources?: SessionPlayerStateSnapshot['statSources'];
	skipPhases?: SessionPlayerStateSnapshot['skipPhases'];
	skipSteps?: SessionPlayerStateSnapshot['skipSteps'];
	passives?: SessionPlayerStateSnapshot['passives'];
}

export function createSnapshotPlayer({
	id,
	name = `Player ${id}`,
	aiControlled,
	resources = {},
	stats = {},
	resourceTouchedV2 = {},
	population = {},
	valuesV2 = {},
	resourceBoundsV2 = {},
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
		resources: { ...resources },
		stats: { ...stats },
		resourceTouchedV2: { ...resourceTouchedV2 },
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
	snapshot.valuesV2 = { ...valuesV2 };
	const normalizedBounds: Record<string, SessionResourceBoundsV2> = {};
	for (const [resourceId, bounds] of Object.entries(resourceBoundsV2)) {
		normalizedBounds[resourceId] = {
			lowerBound: bounds.lowerBound !== undefined ? bounds.lowerBound : null,
			upperBound: bounds.upperBound !== undefined ? bounds.upperBound : null,
		};
	}
	snapshot.resourceBoundsV2 = normalizedBounds;
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
	resourceCatalogV2?: SessionResourceCatalogV2;
	resourceMetadataV2?: SessionSnapshot['resourceMetadataV2'];
	resourceGroupMetadataV2?: SessionSnapshot['resourceGroupMetadataV2'];
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
	const resourceCatalog = clone(resourceCatalogV2 ?? EMPTY_RESOURCE_CATALOG_V2);
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
			resourceCatalogV2: resourceCatalog,
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
	if (resourceMetadataV2) {
		snapshot.resourceMetadataV2 = clone(resourceMetadataV2);
	}
	if (resourceGroupMetadataV2) {
		snapshot.resourceGroupMetadataV2 = clone(resourceGroupMetadataV2);
	}
	return snapshot;
}
