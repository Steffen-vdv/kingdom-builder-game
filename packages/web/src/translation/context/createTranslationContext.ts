import type {
	EffectDef,
	SessionPlayerId,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import type { SessionRegistries } from '../../state/sessionRegistries';
import { createTranslationAssets } from './assets';
import type { TranslationContext, TranslationPassives } from './types';
import {
	cloneCompensations,
	cloneEvaluationModifiers,
	clonePassiveSummary,
	clonePlayer,
	cloneRecentResourceGains,
	flattenPassives,
	mapPassives,
	mapPassiveDescriptors,
	wrapActionCategoryRegistry,
	wrapRegistry,
} from './contextHelpers';
import {
	buildResourceV2MetadataRegistry,
	createResourceV2MetadataSelectors,
	wrapResourceCatalogV2,
} from './resourceV2Helpers';
import {
	EMPTY_PASSIVE_DEFINITIONS,
	cloneRuleSnapshot,
	mapPassiveDefinitionLists,
	mapPassiveDefinitionLookup,
} from './passiveDefinitions';
import {
	buildResourceV2SignedGainEntries,
	type ResourceV2ValueSnapshot,
} from '../resourceV2';

type TranslationContextOptions = {
	ruleSnapshot: SessionRuleSnapshot;
	passiveRecords: SessionSnapshot['passiveRecords'];
};

export function createTranslationContext(
	session: SessionSnapshot,
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'buildings'
		| 'developments'
		| 'populations'
		| 'resources'
	>,
	metadata: SessionSnapshotMetadata,
	options: TranslationContextOptions,
): TranslationContext {
	const players = new Map(
		session.game.players.map((player) => [player.id, clonePlayer(player)]),
	);
	const activePlayer = players.get(session.game.activePlayerId);
	const opponent = players.get(session.game.opponentId);
	if (!activePlayer || !opponent) {
		throw new Error('Unable to resolve active players from session snapshot.');
	}
	const passives = mapPassives(session.game.players);
	const passiveDescriptors = mapPassiveDescriptors(passives);
	const evaluationMods = cloneEvaluationModifiers(
		metadata.passiveEvaluationModifiers,
	);
	const ruleSnapshot = cloneRuleSnapshot(options.ruleSnapshot);
	const passiveDefinitionLists = mapPassiveDefinitionLists(
		options.passiveRecords,
	);
	const passiveDefinitionLookup = mapPassiveDefinitionLookup(
		passiveDefinitionLists,
	);
	const effectLogs = new Map<string, unknown[]>();
	if (metadata.effectLogs) {
		const entries = Object.entries(metadata.effectLogs);
		for (const [key, logEntries] of entries) {
			effectLogs.set(key, [...logEntries]);
		}
	}
	const translationPassives: TranslationPassives = Object.freeze({
		list(owner?: SessionPlayerId) {
			if (owner) {
				return passives.get(owner)?.map(clonePassiveSummary) ?? [];
			}
			return flattenPassives(passives);
		},
		get(id: string, owner: SessionPlayerId) {
			const ownerDescriptors = passiveDescriptors.get(owner);
			return ownerDescriptors?.get(id);
		},
		getDefinition(id: string, owner: SessionPlayerId) {
			const definitions = passiveDefinitionLookup.get(owner);
			return definitions?.get(id);
		},
		definitions(owner: SessionPlayerId) {
			return passiveDefinitionLists.get(owner) ?? EMPTY_PASSIVE_DEFINITIONS;
		},
		get evaluationMods() {
			return evaluationMods;
		},
	});
	const assets = createTranslationAssets(registries, metadata, {
		rules: options.ruleSnapshot,
	});
	const resourceCatalog = wrapResourceCatalogV2(session.game.resourceCatalogV2);
	const resourceMetadataDescriptors =
		session.resourceMetadataV2 ?? metadata.resourcesV2;
	const resourceMetadataRegistry = buildResourceV2MetadataRegistry(
		session.game.resourceCatalogV2,
		resourceMetadataDescriptors,
	);
	const resourceMetadataSelectors = createResourceV2MetadataSelectors(
		resourceMetadataRegistry,
	);
	const resourceSignedGainBuilder = Object.freeze({
		fromSnapshot(snapshot: ResourceV2ValueSnapshot) {
			const metadataEntry = resourceMetadataRegistry.map.get(snapshot.id);
			if (!metadataEntry) {
				return [];
			}
			return buildResourceV2SignedGainEntries(metadataEntry, snapshot);
		},
	});
	const resourceV2 = Object.freeze({
		catalog: resourceCatalog,
		metadata: resourceMetadataSelectors,
		signedGains: resourceSignedGainBuilder,
	});
	return Object.freeze({
		actions: wrapRegistry(registries.actions),
		actionCategories: wrapActionCategoryRegistry(registries.actionCategories),
		buildings: wrapRegistry(registries.buildings),
		developments: wrapRegistry(registries.developments),
		populations: wrapRegistry(registries.populations),
		passives: translationPassives,
		phases: Object.freeze(
			session.phases.map((phase) => {
				const entry: {
					id: string;
					icon?: string;
					label?: string;
					steps?: ReadonlyArray<{
						id: string;
						triggers?: readonly string[];
					}>;
				} = {
					id: phase.id,
				};
				if (phase.icon !== undefined) {
					entry.icon = phase.icon;
				}
				if (phase.label !== undefined) {
					entry.label = phase.label;
				}
				if (Array.isArray(phase.steps)) {
					entry.steps = Object.freeze(
						phase.steps.map((step) => {
							const stepEntry: {
								id: string;
								title?: string;
								icon?: string;
								triggers?: readonly string[];
								effects?: readonly EffectDef[];
							} = {
								id: step.id,
							};
							if (step.title !== undefined) {
								stepEntry.title = step.title;
							}
							if (Array.isArray(step.triggers)) {
								stepEntry.triggers = Object.freeze([...step.triggers]);
							}
							if (Array.isArray(step.effects)) {
								stepEntry.effects = Object.freeze(
									step.effects.map((effect) => structuredClone(effect)),
								);
							}
							return Object.freeze(stepEntry);
						}),
					);
				}
				return Object.freeze(entry);
			}),
		),
		activePlayer,
		opponent,
		pullEffectLog<T>(key: string) {
			const queue = effectLogs.get(key);
			if (!queue || queue.length === 0) {
				return undefined;
			}
			const next = queue.shift();
			if (queue.length === 0) {
				effectLogs.delete(key);
			}
			if (next === undefined) {
				return undefined;
			}
			if (typeof next === 'object' && next !== null) {
				return structuredClone(next) as T;
			}
			return next as T;
		},
		actionCostResource: session.actionCostResource,
		recentResourceGains: cloneRecentResourceGains(session.recentResourceGains),
		compensations: cloneCompensations(session.compensations),
		resourceV2,
		rules: ruleSnapshot,
		assets,
	});
}
