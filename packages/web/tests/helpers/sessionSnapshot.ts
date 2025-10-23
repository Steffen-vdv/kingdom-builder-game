import type {
	PlayerStartConfig,
	SessionOverviewMetadata,
	SessionPassiveRecordSnapshot,
	SessionPhaseDefinition,
	SessionPlayerId,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
} from '@kingdom-builder/protocol/session';

export const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

const cloneRecord = <T>(record: Record<string, T>): Record<string, T> =>
	Object.fromEntries(
		Object.entries(record).map(([key, entry]) => [key, clone(entry)]),
	);

const cloneOptionalRecord = <T>(
	record: Record<string, T> | undefined,
): Record<string, T> | undefined => (record ? cloneRecord(record) : undefined);

const cloneStringArray = (values: string[] | undefined): string[] =>
	values ? [...values] : [];

export const createEmptySnapshotMetadata = (
	overrides: Partial<SessionSnapshotMetadata> = {},
): SessionSnapshotMetadata => {
	const {
		assets: assetOverrides,
		resourceMetadata: resourceMetadataOverride,
		resourceGroups: resourceGroupsOverride,
		resourceGroupParents: resourceGroupParentsOverride,
		orderedResourceIds: orderedResourceIdsOverride,
		orderedResourceGroupIds: orderedResourceGroupIdsOverride,
		parentIdByResourceId: parentIdByResourceIdOverride,
		...metadataOverrides
	} = overrides;
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
		resourceMetadata: {},
		resourceGroups: {},
		resourceGroupParents: {},
		orderedResourceIds: [],
		orderedResourceGroupIds: [],
		parentIdByResourceId: {},
		...metadataOverrides,
	};
	metadata.resourceMetadata =
		cloneOptionalRecord(resourceMetadataOverride) ??
		metadata.resourceMetadata ??
		{};
	metadata.resourceGroups =
		cloneOptionalRecord(resourceGroupsOverride) ??
		metadata.resourceGroups ??
		{};
	metadata.resourceGroupParents =
		cloneOptionalRecord(resourceGroupParentsOverride) ??
		metadata.resourceGroupParents ??
		{};
	metadata.orderedResourceIds = orderedResourceIdsOverride
		? cloneStringArray(orderedResourceIdsOverride)
		: cloneStringArray(metadata.orderedResourceIds);
	metadata.orderedResourceGroupIds = orderedResourceGroupIdsOverride
		? cloneStringArray(orderedResourceGroupIdsOverride)
		: cloneStringArray(metadata.orderedResourceGroupIds);
	metadata.parentIdByResourceId = parentIdByResourceIdOverride
		? { ...parentIdByResourceIdOverride }
		: { ...(metadata.parentIdByResourceId ?? {}) };
	return metadata;
};

export interface SessionSnapshotOptions {
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
	resourceMetadata?: Record<string, SessionResourceV2MetadataSnapshot>;
	resourceGroups?: Record<string, SessionResourceV2GroupSnapshot>;
	resourceGroupParents?: Record<string, SessionResourceV2GroupParentSnapshot>;
	orderedResourceIds?: string[];
	orderedResourceGroupIds?: string[];
	parentIdByResourceId?: Record<string, string>;
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
	resourceMetadata,
	resourceGroups,
	resourceGroupParents,
	orderedResourceIds,
	orderedResourceGroupIds,
	parentIdByResourceId,
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

	const baseResourceMetadata =
		cloneOptionalRecord(resourceMetadata) ??
		cloneOptionalRecord(metadata.resourceMetadata) ??
		{};
	const baseResourceGroups =
		cloneOptionalRecord(resourceGroups) ??
		cloneOptionalRecord(metadata.resourceGroups) ??
		{};
	const baseResourceGroupParents =
		cloneOptionalRecord(resourceGroupParents) ??
		cloneOptionalRecord(metadata.resourceGroupParents) ??
		{};
	const baseOrderedResourceIds =
		orderedResourceIds ?? metadata.orderedResourceIds ?? [];
	const baseOrderedResourceGroupIds =
		orderedResourceGroupIds ?? metadata.orderedResourceGroupIds ?? [];
	const baseParentIdByResourceId =
		parentIdByResourceId ?? metadata.parentIdByResourceId ?? {};

	metadata.resourceMetadata = cloneOptionalRecord(baseResourceMetadata) ?? {};
	metadata.resourceGroups = cloneOptionalRecord(baseResourceGroups) ?? {};
	metadata.resourceGroupParents =
		cloneOptionalRecord(baseResourceGroupParents) ?? {};
	metadata.orderedResourceIds = [...baseOrderedResourceIds];
	metadata.orderedResourceGroupIds = [...baseOrderedResourceGroupIds];
	metadata.parentIdByResourceId = { ...baseParentIdByResourceId };

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
		resourceMetadata: cloneOptionalRecord(baseResourceMetadata) ?? {},
		resourceGroups: cloneOptionalRecord(baseResourceGroups) ?? {},
		orderedResourceIds: [...baseOrderedResourceIds],
		orderedResourceGroupIds: [...baseOrderedResourceGroupIds],
		parentIdByResourceId: { ...baseParentIdByResourceId },
	} satisfies SessionSnapshot;
}
