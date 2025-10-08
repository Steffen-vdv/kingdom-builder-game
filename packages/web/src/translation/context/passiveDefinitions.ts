import type {
	EngineSessionSnapshot,
	PassiveRecordSnapshot,
	PlayerId,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import type { TranslationPassiveDefinition } from './types';

export const EMPTY_PASSIVE_DEFINITIONS = Object.freeze(
	[] as TranslationPassiveDefinition[],
);

export function clonePassiveDefinition(
	definition: PassiveRecordSnapshot,
): TranslationPassiveDefinition {
	const cloned = structuredClone<TranslationPassiveDefinition>(definition);
	return Object.freeze(cloned);
}

export function mapPassiveDefinitionLists(
	records: EngineSessionSnapshot['passiveRecords'],
): ReadonlyMap<PlayerId, ReadonlyArray<TranslationPassiveDefinition>> {
	const lists = new Map<
		PlayerId,
		ReadonlyArray<TranslationPassiveDefinition>
	>();
	for (const ownerId of Object.keys(records) as PlayerId[]) {
		const entries = records[ownerId] ?? [];
		const clones = entries.map(clonePassiveDefinition);
		lists.set(ownerId, Object.freeze(clones));
	}
	return lists;
}

export function mapPassiveDefinitionLookup(
	lists: ReadonlyMap<PlayerId, ReadonlyArray<TranslationPassiveDefinition>>,
): ReadonlyMap<PlayerId, ReadonlyMap<string, TranslationPassiveDefinition>> {
	const lookup = new Map<
		PlayerId,
		ReadonlyMap<string, TranslationPassiveDefinition>
	>();
	for (const [owner, definitions] of lists.entries()) {
		const entries = definitions.map<[string, TranslationPassiveDefinition]>(
			(definition) => [definition.id, definition],
		);
		lookup.set(owner, new Map<string, TranslationPassiveDefinition>(entries));
	}
	return lookup;
}

export function cloneRuleSnapshot(ruleSnapshot: RuleSnapshot): RuleSnapshot {
	return Object.freeze({
		tieredResourceKey: ruleSnapshot.tieredResourceKey,
		tierDefinitions: structuredClone(ruleSnapshot.tierDefinitions),
		winConditions: structuredClone(ruleSnapshot.winConditions),
	});
}
