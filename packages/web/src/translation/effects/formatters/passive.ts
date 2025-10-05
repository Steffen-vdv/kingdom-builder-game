import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import { PHASES, PASSIVE_INFO } from '@kingdom-builder/contents';
import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import type { PhaseDef } from '@kingdom-builder/engine/phases';

type PassiveDurationMeta = {
	label: string;
	icon?: string;
	phaseId?: string;
	source: 'manual' | 'phase' | 'fallback';
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

function resolvePhaseMeta(
	ctx: EngineContext,
	id: string | undefined,
): PhaseDef | undefined {
	if (!id) {
		return undefined;
	}
	return (
		ctx.phases.find((phase) => phase.id === id) ??
		PHASES.find((phaseDefinition) => phaseDefinition.id === id)
	);
}

const PHASE_TRIGGER_KEY_PATTERN = /^on[A-Z][A-Za-z0-9]*Phase$/;
const PHASE_TRIGGER_FALLBACK_LABELS: Record<string, string> = {
	onGrowthPhase: 'Growth',
	onUpkeepPhase: 'Upkeep',
};

function resolvePhaseByTrigger(
	ctx: EngineContext,
	triggerId: string,
): PhaseDef | undefined {
	const fromContext = ctx.phases.find((phase) =>
		phase.steps.some((step) => {
			const triggers = step.triggers as readonly string[] | undefined;
			return triggers?.includes(triggerId);
		}),
	);
	if (fromContext) {
		return fromContext;
	}
	return PHASES.find((phase) =>
		phase.steps.some((step) => {
			const triggers = step.triggers as readonly string[] | undefined;
			return triggers?.includes(triggerId);
		}),
	);
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
	ctx: EngineContext,
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

	if (!label && !resolvedPhase) {
		for (const triggerId of triggerKeys) {
			const fallbackLabel = PHASE_TRIGGER_FALLBACK_LABELS[triggerId];
			if (fallbackLabel) {
				label = fallbackLabel;
				source = 'fallback';
				break;
			}
		}
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

function formatDuration(
	meta: PassiveDurationMeta,
	{ includePhase }: { includePhase: boolean },
) {
	const icon = meta.icon ? `${meta.icon} ` : '';
	const suffix = includePhase && meta.source === 'fallback' ? ' Phase' : '';
	return `${icon}${meta.label}${suffix}`;
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
				title: `⏳ Until next ${formatDuration(duration, {
					includePhase: false,
				})}`,
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
				title: `${prefix}${name} – Until your next ${formatDuration(duration, {
					includePhase: true,
				})}`,
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
		const inner = describeEffects(eff.effects || [], ctx);
		const items = [...(inner.length ? inner : [])];
		const duration = resolveDurationMeta(eff, ctx);
		if (duration) {
			items.push(
				`${prefix}${name} duration: Until player's next ${formatDuration(
					duration,
					{ includePhase: true },
				)}`,
			);
		}
		return { title: `${prefix}${name} added`, items };
	},
});
