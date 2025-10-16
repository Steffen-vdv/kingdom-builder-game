import type {
	TranslationAssets,
	TranslationPhase,
	TranslationPhaseStep,
} from '../../translation/context';

interface FormattablePhaseStep extends TranslationPhaseStep {
	icon?: string;
	title?: string;
}

/**
 * Normalize overloaded arguments into a single object containing `phases`, `phaseId`, and `stepId`.
 *
 * @param phasesOrPhaseId - Either an array of phases, a phase id string, or `undefined`. When an array is provided, it becomes the returned `phases`. When a string is provided, it becomes the returned `phaseId`.
 * @param maybePhaseId - When `phasesOrPhaseId` is an array, this is treated as the `phaseId`. When `phasesOrPhaseId` is a string or `undefined`, this is treated as the `stepId`.
 * @param maybeStepId - When `phasesOrPhaseId` is an array, this is treated as the `stepId`. Ignored otherwise.
 * @returns An object with:
 * - `phases`: the input array when one was provided, otherwise `undefined`.
 * - `phaseId`: the resolved phase id when available, otherwise `undefined`.
 * - `stepId`: the resolved step id when available, otherwise `undefined`.
 */
function resolvePhaseArguments(
	phasesOrPhaseId: readonly TranslationPhase[] | string | undefined,
	maybePhaseId?: string,
	maybeStepId?: string,
): {
	phases: readonly TranslationPhase[] | undefined;
	phaseId: string | undefined;
	stepId: string | undefined;
} {
	if (Array.isArray(phasesOrPhaseId)) {
		return {
			phases: phasesOrPhaseId,
			phaseId: maybePhaseId,
			stepId: maybeStepId,
		};
	}
	if (typeof phasesOrPhaseId === 'string') {
		return {
			phases: undefined,
			phaseId: phasesOrPhaseId,
			stepId: maybePhaseId,
		};
	}
	return {
		phases: undefined,
		phaseId: undefined,
		stepId: maybePhaseId,
	};
}

/**
 * Determine whether the stat identified by `key` should be displayed as a percentage.
 *
 * Checks the translation assets for a matching stat and returns `true` when the stat
 * explicitly indicates a percent display — either via `displayAsPercent: true` or a
 * `format` object with `percent` set — otherwise returns `false`.
 *
 * @param key - The stat key to look up in `assets.stats`
 * @param assets - Optional translation assets containing stat metadata
 * @returns `true` if the stat should be displayed as a percentage, `false` otherwise
 */
export function statDisplaysAsPercent(
	key: string,
	assets?: TranslationAssets,
): boolean {
	const stat = assets?.stats?.[key];
	if (!stat) {
		return false;
	}
	if (typeof stat.displayAsPercent === 'boolean') {
		return stat.displayAsPercent;
	}
	const format = stat.format;
	if (format && typeof format === 'object') {
		return Boolean(format.percent);
	}
	return false;
}

export function formatStatValue(
	key: string,
	value: number,
	assets?: TranslationAssets,
): string {
	return statDisplaysAsPercent(key, assets) ? `${value * 100}%` : String(value);
}

export function formatDetailText(detail: string): string {
	if (!detail) {
		return '';
	}
	if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(detail)) {
		return detail
			.split('-')
			.filter((segment) => segment.length)
			.map((segment) => {
				const head = segment.charAt(0).toUpperCase();
				return head + segment.slice(1);
			})
			.join(' ');
	}
	if (/^[a-z]/.test(detail)) {
		return detail.charAt(0).toUpperCase() + detail.slice(1);
	}
	return detail;
}

export function formatStepLabel(
	phases: readonly TranslationPhase[],
	phaseId: string | undefined,
	stepId: string | undefined,
): string | undefined;
export function formatStepLabel(
	phaseId: string | undefined,
	stepId: string | undefined,
): string | undefined;
export function formatStepLabel(
	phasesOrPhaseId: readonly TranslationPhase[] | string | undefined,
	maybePhaseId?: string,
	maybeStepId?: string,
): string | undefined {
	const { phases, phaseId, stepId } = resolvePhaseArguments(
		phasesOrPhaseId,
		maybePhaseId,
		maybeStepId,
	);

	if (!stepId) {
		return undefined;
	}
	const phase =
		phaseId && phases
			? phases.find((phaseItem) => phaseItem.id === phaseId)
			: undefined;
	const step = findPhaseStep(phase?.steps, stepId);
	if (!step) {
		return formatDetailText(stepId);
	}
	const parts: string[] = [];
	if (typeof step.icon === 'string' && step.icon.length > 0) {
		parts.push(step.icon);
	}
	const stepTitle = step.title;
	const hasTitle = typeof stepTitle === 'string' && stepTitle.length > 0;
	const stepLabelSource = hasTitle ? stepTitle : step.id;
	if (stepLabelSource) {
		parts.push(formatDetailText(stepLabelSource));
	}
	return parts.join(' ').trim();
}

export function formatPhaseStep(
	phases: readonly TranslationPhase[],
	phaseId: string | undefined,
	stepId: string | undefined,
): string | undefined;
export function formatPhaseStep(
	phaseId: string | undefined,
	stepId: string | undefined,
): string | undefined;
export function formatPhaseStep(
	phasesOrPhaseId: readonly TranslationPhase[] | string | undefined,
	maybePhaseId?: string,
	maybeStepId?: string,
): string | undefined {
	const { phases, phaseId, stepId } = resolvePhaseArguments(
		phasesOrPhaseId,
		maybePhaseId,
		maybeStepId,
	);

	if (!stepId) {
		return undefined;
	}
	const phase =
		phaseId && phases
			? phases.find((phaseItem) => phaseItem.id === phaseId)
			: undefined;
	const step = findPhaseStep(phase?.steps, stepId);
	if (!step) {
		const phaseLabel = phaseId ? formatDetailText(phaseId) : undefined;
		const stepLabel = formatDetailText(stepId);
		return phaseLabel && phaseLabel !== stepLabel
			? `${phaseLabel} · ${stepLabel}`
			: stepLabel;
	}
	const parts: string[] = [];
	if (typeof phase?.icon === 'string' && phase.icon.length > 0) {
		parts.push(phase.icon);
	}
	if (typeof phase?.label === 'string' && phase.label.length > 0) {
		parts.push(phase.label);
	}
	const resolvedPhases = phases ?? [];
	const stepText = formatStepLabel(resolvedPhases, phaseId, stepId);
	if (parts.length && stepText) {
		return `${parts.join(' ').trim()} · ${stepText}`;
	}
	return stepText ?? parts.join(' ').trim();
}

function findPhaseStep(
	steps: readonly unknown[] | undefined,
	stepId: string,
): FormattablePhaseStep | undefined {
	if (!steps) {
		return undefined;
	}
	for (const candidate of steps) {
		if (!candidate || typeof candidate !== 'object') {
			continue;
		}
		const record = candidate as {
			id?: unknown;
			icon?: unknown;
			title?: unknown;
			triggers?: unknown;
		};
		if (record.id !== stepId) {
			continue;
		}
		const result: FormattablePhaseStep = { id: stepId };
		if (Array.isArray(record.triggers)) {
			result.triggers = record.triggers as readonly string[];
		}
		if (typeof record.icon === 'string') {
			result.icon = record.icon;
		}
		if (typeof record.title === 'string') {
			result.title = record.title;
		}
		return result;
	}
	return undefined;
}