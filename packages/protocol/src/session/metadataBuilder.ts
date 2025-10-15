import type {
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionTriggerMetadata,
} from './index.js';

export interface PhaseStepDefinitionLike {
	readonly id: string;
	readonly title?: string;
	readonly icon?: string;
	readonly triggers?: ReadonlyArray<string>;
}

export interface PhaseDefinitionLike {
	readonly id: string;
	readonly label?: string;
	readonly icon?: string;
	readonly action?: boolean;
	readonly steps?: ReadonlyArray<PhaseStepDefinitionLike>;
}

export interface TriggerInfoDefinitionLike {
	readonly icon?: string;
	readonly future?: string;
	readonly past?: string;
}

export interface SessionMetadataBuilderSource {
	readonly phases?: Iterable<PhaseDefinitionLike>;
	readonly triggers?: Record<string, TriggerInfoDefinitionLike | undefined>;
}

function createPhaseStepMetadata(
	step: PhaseStepDefinitionLike,
): SessionPhaseStepMetadata {
	const triggers = step.triggers;
	return {
		id: step.id,
		...(step.title !== undefined ? { label: step.title } : {}),
		...(step.icon !== undefined ? { icon: step.icon } : {}),
		...(triggers !== undefined && triggers.length > 0
			? { triggers: [...triggers] }
			: {}),
	};
}

function createPhaseMetadata(phase: PhaseDefinitionLike): SessionPhaseMetadata {
	const steps = phase.steps?.map(createPhaseStepMetadata) ?? [];
	return {
		id: phase.id,
		...(phase.label !== undefined ? { label: phase.label } : {}),
		...(phase.icon !== undefined ? { icon: phase.icon } : {}),
		...(phase.action !== undefined ? { action: phase.action } : {}),
		...(steps.length > 0 ? { steps } : {}),
	};
}

export function buildPhaseMetadataMap(
	phases: Iterable<PhaseDefinitionLike>,
): Record<string, SessionPhaseMetadata> {
	const entries: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		entries[phase.id] = createPhaseMetadata(phase);
	}
	return entries;
}

export function buildTriggerMetadataMap(
	triggerInfo: Record<string, TriggerInfoDefinitionLike | undefined>,
): Record<string, SessionTriggerMetadata> {
	const entries: Record<string, SessionTriggerMetadata> = {};
	for (const [id, info] of Object.entries(triggerInfo)) {
		if (!info) {
			entries[id] = {};
			continue;
		}
		entries[id] = {
			...(info.past !== undefined ? { label: info.past, past: info.past } : {}),
			...(info.icon !== undefined ? { icon: info.icon } : {}),
			...(info.future !== undefined ? { future: info.future } : {}),
		} satisfies SessionTriggerMetadata;
	}
	return entries;
}

export function buildSessionMetadataFromContent(
	source: SessionMetadataBuilderSource,
): {
	readonly phases?: Record<string, SessionPhaseMetadata>;
	readonly triggers?: Record<string, SessionTriggerMetadata>;
} {
	const phases = source.phases
		? buildPhaseMetadataMap(source.phases)
		: undefined;
	const triggers = source.triggers
		? buildTriggerMetadataMap(source.triggers)
		: undefined;
	return {
		...(phases !== undefined ? { phases } : {}),
		...(triggers !== undefined ? { triggers } : {}),
	};
}
