import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type {
	SessionRequirementFailure,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import type { GameSessionApi } from './GameContext.types';
import type { SessionMetadata } from './sessionTypes';

type MetadataRecord<T> = Map<string, T> | Record<string, T> | undefined;

interface ExtendedSessionMetadata extends SessionMetadata {
	costMap?: MetadataRecord<Record<string, unknown>>;
	requirementFailures?: MetadataRecord<SessionRequirementFailure[]>;
	actions?: Record<string, unknown>;
}

function isRecordSource<T>(
	source: MetadataRecord<T>,
): source is Record<string, T> {
	if (source === null || source === undefined) {
		return false;
	}
	if (source instanceof Map) {
		return false;
	}
	return typeof source === 'object';
}

function readMetadataEntry<T>(
	source: MetadataRecord<T>,
	key: string,
): T | undefined {
	if (!source) {
		return undefined;
	}
	if (source instanceof Map) {
		return source.get(key);
	}
	if (isRecordSource(source)) {
		if (Object.prototype.hasOwnProperty.call(source, key)) {
			return source[key];
		}
	}
	return undefined;
}

function cloneRequirementFailures(
	failures: SessionRequirementFailure[] | undefined,
): SessionRequirementFailure[] {
	if (!Array.isArray(failures)) {
		return [];
	}
	return failures.map((failure) => ({
		requirement: { ...failure.requirement },
		...(failure.details ? { details: { ...failure.details } } : {}),
		...(failure.message ? { message: failure.message } : {}),
	}));
}

function cloneEffectGroup(group: ActionEffectGroup): ActionEffectGroup {
	return {
		...group,
		options: group.options.map((option) => ({
			...option,
			...(option.params ? { params: { ...option.params } } : {}),
		})),
	};
}

function readActionGroups(
	metadata: ExtendedSessionMetadata,
	actionId: string,
): ActionEffectGroup[] {
	const actions = metadata.actions ?? {};
	const entry = actions[actionId];
	if (!entry || typeof entry !== 'object') {
		return [];
	}
	const candidates: Array<ActionEffectGroup[] | undefined> = [
		(entry as { effectGroups?: ActionEffectGroup[] }).effectGroups,
		(entry as { groups?: ActionEffectGroup[] }).groups,
		(entry as { options?: ActionEffectGroup[] }).options,
	];
	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate.map((group) => cloneEffectGroup(group));
		}
	}
	return [];
}

function normalizeCostBag(
	costBag: Record<string, unknown> | undefined,
): Record<string, number> {
	if (!costBag) {
		return {};
	}
	const normalized: Record<string, number> = {};
	for (const [resourceKey, amount] of Object.entries(costBag)) {
		const numeric = Number(amount ?? 0);
		if (Number.isFinite(numeric)) {
			normalized[resourceKey] = numeric;
		}
	}
	return normalized;
}

export function createSessionApi(
	metadata: SessionMetadata,
	_snapshot: SessionSnapshot,
): GameSessionApi {
	const extended = metadata as ExtendedSessionMetadata;
	return {
		getActionCosts(actionId) {
			const raw = readMetadataEntry<Record<string, unknown>>(
				extended.costMap,
				actionId,
			);
			return normalizeCostBag(raw);
		},
		getActionRequirements(actionId) {
			const failures = readMetadataEntry<SessionRequirementFailure[]>(
				extended.requirementFailures,
				actionId,
			);
			return cloneRequirementFailures(failures);
		},
		getActionOptions(actionId) {
			return readActionGroups(extended, actionId);
		},
	};
}
