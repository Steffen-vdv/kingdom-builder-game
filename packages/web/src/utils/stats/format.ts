import { STATS } from '@kingdom-builder/contents';
import type {
	TranslationAssets,
	TranslationPhase,
	TranslationPhaseStep,
} from '../../translation/context';

interface FormattablePhaseStep extends TranslationPhaseStep {
	icon?: string;
	title?: string;
}

export function statDisplaysAsPercent(
	key: string,
	assets?: TranslationAssets | null,
): boolean {
	const asset = assets?.stats?.[key];
	if (asset && typeof asset.displayAsPercent === 'boolean') {
		return asset.displayAsPercent;
	}
	const stat = STATS[key as keyof typeof STATS];
	if (stat && typeof stat.displayAsPercent === 'boolean') {
		return stat.displayAsPercent;
	}
	return false;
}

export function formatStatValue(
	key: string,
	value: number,
	assets?: TranslationAssets | null,
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
	phases: readonly TranslationPhase[] | undefined,
	phaseId?: string,
	stepId?: string,
): string | undefined;
export function formatStepLabel(
	phaseId?: string,
	stepId?: string,
): string | undefined;
export function formatStepLabel(
	phasesOrPhaseId?: readonly TranslationPhase[] | string,
	phaseIdOrStepId?: string,
	maybeStepId?: string,
): string | undefined {
	const { phases, phaseId, stepId } = normalizePhaseArgs(
		phasesOrPhaseId,
		phaseIdOrStepId,
		maybeStepId,
	);
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
		? phases?.find((phaseItem) => phaseItem.id === phaseId)
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
	phases: readonly TranslationPhase[] | undefined,
	phaseId?: string,
	stepId?: string,
): string | undefined;
export function formatPhaseStep(
	phaseId?: string,
	stepId?: string,
): string | undefined;
export function formatPhaseStep(
	phasesOrPhaseId?: readonly TranslationPhase[] | string,
	phaseIdOrStepId?: string,
	maybeStepId?: string,
): string | undefined {
	const { phases, phaseId, stepId } = normalizePhaseArgs(
		phasesOrPhaseId,
		phaseIdOrStepId,
		maybeStepId,
	);
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
		? phases?.find((phaseItem) => phaseItem.id === phaseId)
		: undefined;
	const step = findPhaseStep(phase?.steps, stepId);
	if (!step) {
		return formatDetailText(stepId);
	}
	const parts: string[] = [];
	if (typeof phase?.icon === 'string' && phase.icon.length > 0) {
		parts.push(phase.icon);
	}
	if (typeof phase?.label === 'string' && phase.label.length > 0) {
		parts.push(phase.label);
	}
	const stepText = formatStepLabel(phases, phaseId, stepId);
	if (parts.length && stepText) {
		return `${parts.join(' ').trim()} · ${stepText}`;
	}
	return stepText;
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
		const step: FormattablePhaseStep = { id: stepId };
		if (Array.isArray(record.triggers)) {
			step.triggers = record.triggers as readonly string[];
		}
		if (typeof record.icon === 'string') {
			step.icon = record.icon;
		}
		if (typeof record.title === 'string') {
			step.title = record.title;
		}
		return step;
	}
	return undefined;
}

function normalizePhaseArgs(
	phasesOrPhaseId?: readonly TranslationPhase[] | string,
	phaseIdOrStepId?: string,
	maybeStepId?: string,
): {
	phases?: readonly TranslationPhase[];
	phaseId?: string;
	stepId?: string;
} {
	const result: {
		phases?: readonly TranslationPhase[];
		phaseId?: string;
		stepId?: string;
	} = {};
	if (Array.isArray(phasesOrPhaseId)) {
		result.phases = phasesOrPhaseId;
		if (phaseIdOrStepId !== undefined) {
			result.phaseId = phaseIdOrStepId;
		}
		if (maybeStepId !== undefined) {
			result.stepId = maybeStepId;
		}
		return result;
	}
	if (typeof phasesOrPhaseId === 'string') {
		result.phaseId = phasesOrPhaseId;
		if (phaseIdOrStepId !== undefined) {
			result.stepId = phaseIdOrStepId;
		}
		return result;
	}
	if (phaseIdOrStepId !== undefined) {
		result.phaseId = phaseIdOrStepId;
	}
	if (maybeStepId !== undefined) {
		result.stepId = maybeStepId;
	}
	return result;
}
