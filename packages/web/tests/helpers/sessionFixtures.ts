import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	PlayerStartConfig,
	SessionOverviewMetadata,
	SessionPassiveRecordSnapshot,
	SessionPhaseDefinition,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionResourceBounds,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionResourceCatalog,
} from '@kingdom-builder/protocol/session';
import {
	clone,
	cloneLands,
	clonePassives,
	cloneSkipPhases,
	cloneSkipSteps,
	cloneResourceSources,
} from './sessionCloneHelpers';

const EMPTY_RESOURCE_CATALOG_V2: SessionResourceCatalog = Object.freeze({
	resources: { byId: {}, ordered: [] },
	groups: { byId: {}, ordered: [] },
	categories: { byId: {}, ordered: [] },
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
		buildings: {},
		developments: {},
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
	resourceTouched?: Record<string, boolean>;
	values?: Record<string, number>;
	resourceBounds?: Record<string, Partial<SessionResourceBounds>>;
	lands?: SessionPlayerStateSnapshot['lands'];
	buildings?: string[];
	actions?: string[];
	resourceSources?: SessionPlayerStateSnapshot['resourceSources'];
	skipPhases?: SessionPlayerStateSnapshot['skipPhases'];
	skipSteps?: SessionPlayerStateSnapshot['skipSteps'];
	passives?: SessionPlayerStateSnapshot['passives'];
}

export function createSnapshotPlayer({
	id,
	name = `Player ${id}`,
	aiControlled,
	resourceTouched = {},
	values = {},
	resourceBounds = {},
	lands = [],
	buildings = [],
	actions = [],
	resourceSources = {},
	skipPhases = {},
	skipSteps = {},
	passives = [],
}: SnapshotPlayerOptions): SessionPlayerStateSnapshot {
	const normalizedBounds: Record<string, SessionResourceBounds> = {};
	for (const [resourceId, bounds] of Object.entries(resourceBounds)) {
		normalizedBounds[resourceId] = {
			lowerBound: bounds.lowerBound !== undefined ? bounds.lowerBound : null,
			upperBound: bounds.upperBound !== undefined ? bounds.upperBound : null,
		};
	}
	const snapshot: SessionPlayerStateSnapshot = {
		id,
		name,
		resourceTouched: { ...resourceTouched },
		values: { ...values },
		resourceBounds: normalizedBounds,
		lands: cloneLands(lands),
		buildings: [...buildings],
		actions: [...actions],
		resourceSources: cloneResourceSources(resourceSources),
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
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
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
	onPayUpkeepStep,
	onGainIncomeStep,
	onGainAPStep,
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
	if (onPayUpkeepStep) {
		record.onPayUpkeepStep = cloneEffects(onPayUpkeepStep);
	}
	if (onGainIncomeStep) {
		record.onGainIncomeStep = cloneEffects(onGainIncomeStep);
	}
	if (onGainAPStep) {
		record.onGainAPStep = cloneEffects(onGainAPStep);
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
	resourceCatalog?: SessionResourceCatalog;
	resourceMetadata?: SessionSnapshot['resourceMetadata'];
	resourceGroupMetadata?: SessionSnapshot['resourceGroupMetadata'];
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
	resourceCatalog,
	resourceMetadata,
	resourceGroupMetadata,
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
	const clonedCatalog = clone(resourceCatalog ?? EMPTY_RESOURCE_CATALOG_V2);
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
			resourceCatalog: clonedCatalog,
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
	if (resourceMetadata) {
		snapshot.resourceMetadata = clone(resourceMetadata);
	}
	if (resourceGroupMetadata) {
		snapshot.resourceGroupMetadata = clone(resourceGroupMetadata);
	}
	return snapshot;
}
