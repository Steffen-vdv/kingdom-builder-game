import type {
	SessionSnapshot,
	SessionPassiveRecordSnapshot,
	SessionPlayerId,
	SessionRuleSnapshot,
} from '@kingdom-builder/protocol';
import type { TranslationPassiveDefinition } from './types';

export const EMPTY_PASSIVE_DEFINITIONS = Object.freeze(
	[] as TranslationPassiveDefinition[],
);

export function clonePassiveDefinition(
	definition: SessionPassiveRecordSnapshot,
): TranslationPassiveDefinition {
	const cloned = structuredClone<TranslationPassiveDefinition>(definition);
	return Object.freeze(cloned);
}

export function mapPassiveDefinitionLists(
	records: SessionSnapshot['passiveRecords'],
): ReadonlyMap<SessionPlayerId, ReadonlyArray<TranslationPassiveDefinition>> {
	const lists = new Map<
		SessionPlayerId,
		ReadonlyArray<TranslationPassiveDefinition>
	>();
	for (const ownerId of Object.keys(records) as SessionPlayerId[]) {
		const entries = records[ownerId] ?? [];
		const clones = entries.map(clonePassiveDefinition);
		lists.set(ownerId, Object.freeze(clones));
	}
	return lists;
}

export function mapPassiveDefinitionLookup(
	lists: ReadonlyMap<
		SessionPlayerId,
		ReadonlyArray<TranslationPassiveDefinition>
	>,
): ReadonlyMap<
	SessionPlayerId,
	ReadonlyMap<string, TranslationPassiveDefinition>
> {
	const lookup = new Map<
		SessionPlayerId,
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

export function cloneRuleSnapshot(
	ruleSnapshot: SessionRuleSnapshot,
): SessionRuleSnapshot {
	return Object.freeze({
		tieredResourceKey: ruleSnapshot.tieredResourceKey,
		tierDefinitions: structuredClone(ruleSnapshot.tierDefinitions),
		winConditions: structuredClone(ruleSnapshot.winConditions),
	});
}
