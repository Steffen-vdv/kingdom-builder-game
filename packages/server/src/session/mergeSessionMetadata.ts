import type {
	SessionOverviewMetadata,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import type { SessionStaticMetadataPayload } from './buildSessionMetadata.js';

const DESCRIPTOR_KEYS: Array<keyof SessionStaticMetadataPayload> = [
	'resources',
	'populations',
	'buildings',
	'developments',
	'stats',
	'phases',
	'triggers',
	'assets',
];

export function mergeSessionMetadata(
	staticMetadata: SessionStaticMetadataPayload,
	snapshotMetadata: SessionSnapshotMetadata | undefined,
): SessionSnapshotMetadata {
	const baseMetadata = structuredClone(staticMetadata);
	const result: SessionSnapshotMetadata = {
		...(baseMetadata as SessionSnapshotMetadata),
		passiveEvaluationModifiers: structuredClone(
			snapshotMetadata?.passiveEvaluationModifiers ?? {},
		),
	};
	if (snapshotMetadata?.effectLogs !== undefined) {
		result.effectLogs = structuredClone(snapshotMetadata.effectLogs);
	}
	for (const key of DESCRIPTOR_KEYS) {
		const baseValue = baseMetadata[key];
		const overrideValue = snapshotMetadata?.[key];
		if (baseValue === undefined && overrideValue === undefined) {
			continue;
		}
		const merged = {
			...(baseValue ? structuredClone(baseValue) : {}),
			...(overrideValue ? structuredClone(overrideValue) : {}),
		};
		if (Object.keys(merged).length > 0) {
			result[key] = merged as never;
		}
	}
	const mergedOverview = mergeOverview(
		baseMetadata.overview,
		snapshotMetadata?.overview,
	);
	if (mergedOverview !== undefined) {
		result.overview = mergedOverview;
	}
	return result;
}

function mergeOverview(
	baseOverview: SessionOverviewMetadata | undefined,
	override: SessionOverviewMetadata | undefined,
): SessionOverviewMetadata | undefined {
	if (!baseOverview && !override) {
		return undefined;
	}
	const result = baseOverview
		? structuredClone(baseOverview)
		: ({} as SessionOverviewMetadata);
	if (!override) {
		return result;
	}
	if (override.hero !== undefined) {
		const baseHero = result.hero ? structuredClone(result.hero) : {};
		const overrideHero = structuredClone(override.hero);
		if (
			overrideHero.tokens ||
			(baseHero as { tokens?: Record<string, string> }).tokens
		) {
			overrideHero.tokens = {
				...(baseHero as { tokens?: Record<string, string> }).tokens,
				...overrideHero.tokens,
			};
		}
		result.hero = {
			...baseHero,
			...overrideHero,
		};
	}
	if (override.sections !== undefined) {
		result.sections = structuredClone(override.sections);
	}
	if (override.tokens !== undefined) {
		result.tokens = {
			...(result.tokens ?? {}),
			...structuredClone(override.tokens),
		};
	}
	return result;
}
