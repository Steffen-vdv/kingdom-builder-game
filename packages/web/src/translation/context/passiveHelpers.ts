import type {
	EngineSessionSnapshot,
	PassiveSummary,
	PlayerId,
	PassiveRecordSnapshot,
} from '@kingdom-builder/engine';
import type {
	TranslationPassiveDefinition,
	TranslationPassiveDescriptor,
} from './types';

export function clonePassiveMeta(
	meta: NonNullable<PassiveSummary['meta']>,
): NonNullable<PassiveSummary['meta']> {
	const cloned: NonNullable<PassiveSummary['meta']> = {};
	if (meta.source !== undefined) {
		cloned.source = { ...meta.source };
	}
	if (meta.removal !== undefined) {
		cloned.removal = { ...meta.removal };
	}
	return Object.freeze(cloned);
}

export function clonePassiveSummary(summary: PassiveSummary): PassiveSummary {
	const cloned: PassiveSummary = { id: summary.id };
	if (summary.name !== undefined) {
		cloned.name = summary.name;
	}
	if (summary.icon !== undefined) {
		cloned.icon = summary.icon;
	}
	if (summary.detail !== undefined) {
		cloned.detail = summary.detail;
	}
	if (summary.meta !== undefined) {
		cloned.meta = clonePassiveMeta(summary.meta);
	}
	return Object.freeze(cloned);
}

export function toPassiveDescriptor(
	summary: PassiveSummary,
): TranslationPassiveDescriptor {
	const descriptor: TranslationPassiveDescriptor = {};
	if (summary.icon !== undefined) {
		descriptor.icon = summary.icon;
	}
	const sourceIcon = summary.meta?.source?.icon;
	if (sourceIcon !== undefined) {
		descriptor.meta = Object.freeze({
			source: Object.freeze({ icon: sourceIcon }),
		});
	}
	return Object.freeze(descriptor);
}

export function mapPassives(
	players: EngineSessionSnapshot['game']['players'],
): ReadonlyMap<PlayerId, PassiveSummary[]> {
	return new Map(
		players.map((player) => [
			player.id,
			player.passives.map(clonePassiveSummary),
		]),
	);
}

export function flattenPassives(
	passives: ReadonlyMap<PlayerId, PassiveSummary[]>,
): PassiveSummary[] {
	return Array.from(passives.values()).flatMap((entries) =>
		entries.map(clonePassiveSummary),
	);
}

export function mapPassiveDescriptors(
	passives: ReadonlyMap<PlayerId, PassiveSummary[]>,
): ReadonlyMap<PlayerId, Map<string, TranslationPassiveDescriptor>> {
	return new Map(
		Array.from(passives.entries()).map(([owner, list]) => [
			owner,
			new Map(
				list.map((summary) => [summary.id, toPassiveDescriptor(summary)]),
			),
		]),
	);
}

export function clonePassiveDefinition(
	record: PassiveRecordSnapshot,
): TranslationPassiveDefinition {
	const cloned = structuredClone(record);
	return Object.freeze(cloned);
}

export function mapPassiveDefinitions(
	records: ReadonlyMap<PlayerId, ReadonlyArray<PassiveRecordSnapshot>>,
): ReadonlyMap<PlayerId, ReadonlyArray<TranslationPassiveDefinition>> {
	return new Map(
		Array.from(records.entries()).map(([owner, list]) => [
			owner,
			Object.freeze(list.map((record) => clonePassiveDefinition(record))),
		]),
	);
}

export function mapPassiveDefinitionLookups(
	definitions: ReadonlyMap<
		PlayerId,
		ReadonlyArray<TranslationPassiveDefinition>
	>,
): ReadonlyMap<PlayerId, Map<string, TranslationPassiveDefinition>> {
	return new Map<PlayerId, Map<string, TranslationPassiveDefinition>>(
		Array.from(definitions.entries()).map(([owner, list]) => [
			owner,
			new Map<string, TranslationPassiveDefinition>(
				list.map<[string, TranslationPassiveDefinition]>((definition) => [
					definition.id as string,
					definition,
				]),
			),
		]),
	);
}
