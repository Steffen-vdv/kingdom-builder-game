import type {
	SessionAdvanceResult,
	SessionPhaseDefinition,
	SessionPhaseStepDefinition,
} from '@kingdom-builder/protocol/session';
import {
	diffStepSnapshots,
	snapshotPlayer,
	type PlayerSnapshot,
	type TranslationDiffContext,
} from '../translation';
import { describeSkipEvent } from '../utils/describeSkipEvent';
import type { ResolutionSource } from './useActionResolution';
import { formatDetailText } from '../utils/stats/format';
import type { SessionResourceKey } from './sessionTypes';

interface FormatPhaseResolutionOptions {
	advance: SessionAdvanceResult;
	before: PlayerSnapshot;
	after?: PlayerSnapshot;
	phaseDefinition?: SessionPhaseDefinition;
	stepDefinition?: SessionPhaseStepDefinition;
	diffContext: TranslationDiffContext;
	resourceKeys?: SessionResourceKey[];
}

interface PhaseResolutionFormatResult {
	source: ResolutionSource;
	lines: string[];
	summaries: string[];
	actorLabel?: string;
}

function appendPhaseSuffix(label: string | undefined) {
	if (!label) {
		return undefined;
	}
	const trimmed = label.trim();
	if (!trimmed) {
		return undefined;
	}
	const normalized = formatDetailText(trimmed);
	if (/phase$/iu.test(normalized)) {
		return normalized;
	}
	return `${normalized} Phase`;
}

function createPhaseDisplay(
	label: string | undefined,
	icon: string | undefined,
) {
	const trimmedLabel = label?.trim();
	const trimmedIcon = icon?.trim();
	const pieces = [trimmedIcon, trimmedLabel].filter((part): part is string =>
		Boolean(part && part.length > 0),
	);
	if (pieces.length) {
		return pieces.join(' ');
	}
	return 'Phase';
}

export function formatPhaseResolution({
	advance,
	before,
	after,
	phaseDefinition,
	stepDefinition,
	diffContext,
	resourceKeys,
}: FormatPhaseResolutionOptions): PhaseResolutionFormatResult {
	const phaseId = phaseDefinition?.id ?? advance.phase;
	const rawPhaseLabel = phaseDefinition?.label ?? advance.phase;
	const actorLabelBase = appendPhaseSuffix(rawPhaseLabel);
	const phaseDisplay = createPhaseDisplay(
		actorLabelBase ?? rawPhaseLabel,
		phaseDefinition?.icon,
	);
	const actorLabel = phaseDisplay;
	const source: ResolutionSource = {
		kind: 'phase',
		label: phaseDisplay,
		...(phaseDefinition?.icon?.trim()
			? { icon: phaseDefinition.icon.trim() }
			: {}),
		...(phaseId ? { id: phaseId } : {}),
	};

	if (advance.skipped) {
		const skipPhase = {
			id: phaseId,
			...(phaseDefinition?.label ? { label: phaseDefinition.label } : {}),
			...(phaseDefinition?.icon ? { icon: phaseDefinition.icon } : {}),
		};
		const skipStep = stepDefinition
			? {
					id: stepDefinition.id,
					...(stepDefinition.title ? { title: stepDefinition.title } : {}),
				}
			: undefined;
		const skipDescription = describeSkipEvent(
			advance.skipped,
			skipPhase,
			skipStep,
			diffContext.assets,
		);
		const lines = skipDescription.logLines.filter((line) =>
			Boolean(line?.trim()),
		);
		const summaries = skipDescription.history.items
			.map((item) => item.text?.trim())
			.filter((item): item is string => Boolean(item && item.length > 0));
		return {
			source,
			lines,
			summaries,
			...(actorLabel ? { actorLabel } : {}),
		};
	}

	const resolvedAfter = after ?? snapshotPlayer(advance.player);
	const stepEffects = advance.effects.length
		? { effects: advance.effects }
		: stepDefinition?.effects?.length
			? { effects: stepDefinition.effects }
			: undefined;
	const changes = diffStepSnapshots(
		before,
		resolvedAfter,
		stepEffects,
		diffContext,
		resourceKeys,
	).filter((line) => Boolean(line?.trim()));
	if (!changes.length) {
		return {
			source,
			lines: [],
			summaries: [],
			...(actorLabel ? { actorLabel } : {}),
		};
	}
	const indentedChanges = changes.map((line) => `    ${line}`);
	const lines = [phaseDisplay, ...indentedChanges];
	const summaries = changes;

	return {
		source,
		lines,
		summaries,
		...(actorLabel ? { actorLabel } : {}),
	};
}

export type { PhaseResolutionFormatResult, FormatPhaseResolutionOptions };
