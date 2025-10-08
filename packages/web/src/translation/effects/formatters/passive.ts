import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import { PHASES, PASSIVE_INFO } from '@kingdom-builder/contents';
import type { EffectDef } from '@kingdom-builder/engine';
import type { PhaseDef } from '@kingdom-builder/engine/phases';
import type { TranslationContext } from '../../context';

type PassiveDurationMeta = {
	label: string;
	icon?: string;
	phaseId?: string;
	source: 'manual' | 'phase';
};

function createMeta(meta: PassiveDurationMeta): PassiveDurationMeta {
	const result: PassiveDurationMeta = {
		label: meta.label,
		source: meta.source,
	};
	if (meta.icon !== undefined) {
		result.icon = meta.icon;
	}
	if (meta.phaseId !== undefined) {
		result.phaseId = meta.phaseId;
	}
	return result;
}

type PassivePhaseInfo = { id: string; label?: string; icon?: string };
type PhaseStepMetadata = { triggers?: readonly string[] };
type PassivePhaseWithSteps = PassivePhaseInfo & {
	steps?: readonly PhaseStepMetadata[];
};
type PhaseWithStepMetadata = PhaseDef | PassivePhaseWithSteps;

function mergePhaseInfo(
	id: string,
	...sources: (PhaseDef | PassivePhaseInfo | undefined)[]
): PassivePhaseInfo | undefined {
	let found = false;
	const info: PassivePhaseInfo = { id };
	for (const source of sources) {
		if (!source) {
			continue;
		}
		found = true;
		if (
			'label' in source &&
			source.label !== undefined &&
			info.label === undefined
		) {
			info.label = source.label;
		}
		if (
			'icon' in source &&
			source.icon !== undefined &&
			info.icon === undefined
		) {
			info.icon = source.icon;
		}
	}
	return found ? info : undefined;
}

function resolvePhaseMeta(
	ctx: TranslationContext,
	id: string | undefined,
): PassivePhaseInfo | undefined {
	if (!id) {
		return undefined;
	}
	const fromContext = ctx.phases.find((phase) => phase.id === id);
	const fromContents = PHASES.find(
		(phaseDefinition) => phaseDefinition.id === id,
	);
	return mergePhaseInfo(id, fromContext, fromContents);
}

const PHASE_TRIGGER_KEY_PATTERN = /^on[A-Z][A-Za-z0-9]*Phase$/;

function resolvePhaseByTrigger(
	ctx: TranslationContext,
	triggerId: string,
): PassivePhaseInfo | undefined {
	const findPhaseWithTrigger = (
		phases: readonly PhaseWithStepMetadata[] | undefined,
	): PhaseDef | PassivePhaseInfo | undefined => {
		if (!phases) {
			return undefined;
		}
		for (const phase of phases) {
			if (!phase || typeof phase !== 'object') {
				continue;
			}
			const steps = phase.steps;
			if (!steps) {
				continue;
			}
			const matches = steps.some((step) => {
				if (!step || typeof step !== 'object') {
					return false;
				}
				const triggers = step.triggers;
				return triggers?.includes(triggerId) ?? false;
			});
			if (matches) {
				return phase as PhaseDef | PassivePhaseInfo;
			}
		}
		return undefined;
	};

	const fromContext = findPhaseWithTrigger(ctx.phases);
	if (fromContext) {
		const fromContents = PHASES.find(
			(phaseDefinition) => phaseDefinition.id === fromContext.id,
		);
		return mergePhaseInfo(fromContext.id, fromContext, fromContents);
	}
	const fromContents = findPhaseWithTrigger(PHASES);
	return fromContents
		? mergePhaseInfo(fromContents.id, fromContents)
		: undefined;
}

function collectPhaseTriggerKeys(params: Record<string, unknown>) {
	return Object.keys(params).filter((key) => {
		if (!PHASE_TRIGGER_KEY_PATTERN.test(key)) {
			return false;
		}
		return params[key] !== undefined;
	});
}

function resolveDurationMeta(
	eff: EffectDef<Record<string, unknown>>,
	ctx: TranslationContext,
): PassiveDurationMeta | null {
	const params = eff.params ?? {};
	const manualLabel =
		typeof params['durationLabel'] === 'string'
			? params['durationLabel']
			: undefined;
	const manualIcon =
		typeof params['durationIcon'] === 'string'
			? params['durationIcon']
			: undefined;
	const durationPhaseId =
		typeof params['durationPhaseId'] === 'string'
			? params['durationPhaseId']
			: undefined;

	let label = manualLabel;
	let icon = manualIcon;
	let source: PassiveDurationMeta['source'] | undefined = manualLabel
		? 'manual'
		: undefined;
	let phaseId: string | undefined = durationPhaseId;

	let resolvedPhase = resolvePhaseMeta(ctx, durationPhaseId);

	const triggerKeys = collectPhaseTriggerKeys(params);
	if (!resolvedPhase) {
		for (const triggerId of triggerKeys) {
			const phase = resolvePhaseByTrigger(ctx, triggerId);
			if (phase) {
				resolvedPhase = phase;
				break;
			}
		}
	}

	if (resolvedPhase && !phaseId) {
		phaseId = resolvedPhase.id;
	}

	if (!label && resolvedPhase?.label) {
		label = resolvedPhase.label;
		source = 'phase';
	}

	if (!icon && resolvedPhase?.icon) {
		icon = resolvedPhase.icon;
	}

	if (!label) {
		return null;
	}

	if (!source) {
		source = manualLabel ? 'manual' : 'phase';
	}

	return createMeta({
		label,
		...(icon !== undefined ? { icon } : {}),
		...(phaseId !== undefined ? { phaseId } : {}),
		source,
	});
}

function formatDuration(meta: PassiveDurationMeta) {
	const icon = meta.icon ? `${meta.icon} ` : '';
	return `${icon}${meta.label}`;
}

registerEffectFormatter('passive', 'add', {
	summarize: (eff, ctx) => {
		const inner = summarizeEffects(eff.effects || [], ctx);
		const duration = resolveDurationMeta(eff, ctx);
		if (!duration) {
			return inner;
		}
		return [
			{
				title: `⏳ Until next ${formatDuration(duration)}`,
				items: inner,
			},
		];
	},
	describe: (eff, ctx) => {
		const icon =
			(eff.params?.['icon'] as string | undefined) ?? PASSIVE_INFO.icon;
		const name =
			(eff.params?.['name'] as string | undefined) ?? PASSIVE_INFO.label;
		const prefix = icon ? `${icon} ` : '';
		const inner = describeEffects(eff.effects || [], ctx);
		const duration = resolveDurationMeta(eff, ctx);
		if (!duration) {
			return inner;
		}
		return [
			{
				title: `${prefix}${name} – Until your next ${formatDuration(duration)}`,
				items: inner,
			},
		];
	},
	log: (eff, ctx) => {
		const icon =
			(eff.params?.['icon'] as string | undefined) ?? PASSIVE_INFO.icon;
		const name =
			(eff.params?.['name'] as string | undefined) ?? PASSIVE_INFO.label;
		const prefix = icon ? `${icon} ` : '';
		const label = `${prefix}${name}`.trim();
		const inner = describeEffects(eff.effects || [], ctx);
		const duration = resolveDurationMeta(eff, ctx);
		const items = [...inner];
		if (duration) {
			items.push(
				`${prefix}${name} duration: Until player's next ${formatDuration(duration)}`,
			);
		}
		if (!label) {
			return items;
		}
		if (items.length === 0) {
			return `${label} added`;
		}
		return [
			{
				title: `${label} added`,
				items,
			},
		];
	},
});
