import { PHASES, STATS } from '@kingdom-builder/contents';

export function statDisplaysAsPercent(key: string): boolean {
	const info = STATS[key as keyof typeof STATS];
	return Boolean(info?.displayAsPercent ?? info?.addFormat?.percent);
}

export function formatStatValue(key: string, value: number): string {
	return statDisplaysAsPercent(key) ? `${value * 100}%` : String(value);
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
	phaseId?: string,
	stepId?: string,
): string | undefined {
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
		? PHASES.find((phaseItem) => phaseItem.id === phaseId)
		: undefined;
	const step = phase?.steps.find((stepItem) => stepItem.id === stepId);
	if (!step) {
		return formatDetailText(stepId);
	}
	const parts: string[] = [];
	if (step.icon) {
		parts.push(step.icon);
	}
	const label = step.title ?? step.id;
	if (label) {
		parts.push(label);
	}
	return parts.join(' ').trim();
}

export function formatPhaseStep(
	phaseId?: string,
	stepId?: string,
): string | undefined {
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
		? PHASES.find((phaseItem) => phaseItem.id === phaseId)
		: undefined;
	const step = phase?.steps.find((stepItem) => stepItem.id === stepId);
	if (!step) {
		return formatDetailText(stepId);
	}
	const parts: string[] = [];
	if (phase?.icon) {
		parts.push(phase.icon);
	}
	if (phase?.label) {
		parts.push(phase.label);
	}
	const stepText = formatStepLabel(phaseId, stepId);
	if (parts.length && stepText) {
		return `${parts.join(' ').trim()} · ${stepText}`;
	}
	return stepText;
}
