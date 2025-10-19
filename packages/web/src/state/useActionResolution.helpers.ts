import type {
	ActionResolution,
	ResolutionActionMeta,
	ResolutionSource,
} from './useActionResolution.types';

const isPhaseSourceDetail = (
	source: ResolutionSource,
): source is Extract<ResolutionSource, { kind: 'phase' }> =>
	typeof source !== 'string' && source.kind === 'phase';

const resolvePhaseIdentity = (
	source: Extract<ResolutionSource, { kind: 'phase' }>,
) => source.id?.trim() || source.label?.trim() || null;

function resolveActorLabel(
	label: string | undefined,
	source: ResolutionSource,
	action: ResolutionActionMeta | undefined,
): string | undefined {
	const trimmed = label?.trim();
	if (trimmed) {
		return trimmed;
	}
	if (typeof source === 'string') {
		if (source === 'action') {
			return action?.name?.trim() || undefined;
		}
		return undefined;
	}
	if (source.kind === 'action') {
		return source.name?.trim() || action?.name?.trim() || undefined;
	}
	return undefined;
}

function shouldAppendPhaseResolution(
	existing: ActionResolution | null,
	nextSource: ResolutionSource,
	requireAcknowledgement: boolean,
) {
	if (
		!existing ||
		existing.requireAcknowledgement ||
		requireAcknowledgement ||
		!isPhaseSourceDetail(existing.source) ||
		!isPhaseSourceDetail(nextSource)
	) {
		return false;
	}
	const existingIdentity = resolvePhaseIdentity(existing.source);
	const nextIdentity = resolvePhaseIdentity(nextSource);
	return Boolean(
		existingIdentity && nextIdentity && existingIdentity === nextIdentity,
	);
}

export { resolveActorLabel, isPhaseSourceDetail, shouldAppendPhaseResolution };
