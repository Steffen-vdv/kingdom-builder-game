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
	assets: TranslationAssets,
): boolean {
	return Boolean(assets.stats[key]?.displayAsPercent);
}

export function formatStatValue(
	key: string,
	value: number,
	assets: TranslationAssets,
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
	phaseId?: string,
	stepId?: string,
): string | undefined {
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
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
	phaseId?: string,
	stepId?: string,
): string | undefined {
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
		? phases.find((phaseItem) => phaseItem.id === phaseId)
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
		};
		if (record.id !== stepId) {
			continue;
		}
		return {
			id: stepId,
			triggers: Array.isArray(record.triggers)
				? (record.triggers as readonly string[])
				: undefined,
			icon: typeof record.icon === 'string' ? record.icon : undefined,
			title: typeof record.title === 'string' ? record.title : undefined,
		} satisfies FormattablePhaseStep;
	}
	return undefined;
}
