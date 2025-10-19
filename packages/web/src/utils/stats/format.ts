import type {
	TranslationAssets,
	TranslationPhase,
	TranslationPhaseStep,
} from '../../translation/context';

const PERCENT_FORMATTER = new Intl.NumberFormat('en-US', {
	minimumFractionDigits: 0,
	maximumFractionDigits: 2,
});

interface FormattablePhaseStep extends TranslationPhaseStep {
	icon?: string;
	title?: string;
}

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
	if (statDisplaysAsPercent(key, assets)) {
		return `${PERCENT_FORMATTER.format(value * 100)}%`;
	}
	return String(value);
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
