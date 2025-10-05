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

type PassivePhaseInfo = { id: string; label?: string; icon?: string };

function toPassivePhaseInfo(phase: PhaseDef | PassivePhaseInfo | undefined) {
	if (!phase) {
		return undefined;
	}
	return {
		id: phase.id,
		label: 'label' in phase ? phase.label : undefined,
		icon: 'icon' in phase ? phase.icon : undefined,
	} satisfies PassivePhaseInfo;
}

function resolvePhaseMeta(
	ctx: TranslationContext,
	id: string | undefined,
): PassivePhaseInfo | undefined {
	if (!id) {
		return undefined;
	}
	const fromLegacy = ctx.legacy?.phases?.find((phase) => phase.id === id);
	if (fromLegacy) {
		return toPassivePhaseInfo(fromLegacy);
	}
	const fromContext = ctx.phases.find((phase) => phase.id === id);
	if (fromContext) {
		return {
			id: fromContext.id,
			label: fromContext.label,
			icon: fromContext.icon,
		};
	}
	const fromContents = PHASES.find(
		(phaseDefinition) => phaseDefinition.id === id,
	);
	return toPassivePhaseInfo(fromContents);
}

const PHASE_TRIGGER_KEY_PATTERN = /^on[A-Z][A-Za-z0-9]*Phase$/;
const PHASE_TRIGGER_FALLBACK_LABELS: Record<string, string> = {
	onGrowthPhase: 'Growth',
	onUpkeepPhase: 'Upkeep',
};

function resolvePhaseByTrigger(
	ctx: TranslationContext,
	triggerId: string,
): PassivePhaseInfo | undefined {
	const findPhaseWithTrigger = (
		phases: readonly unknown[] | undefined,
	): PhaseDef | undefined => {
		if (!phases) {
			return undefined;
		}
		for (const phase of phases) {
			if (!phase || typeof phase !== 'object') {
				continue;
			}
			const withSteps = phase as {
				id: string;
				steps?: readonly unknown[];
			};
			if (!Array.isArray(withSteps.steps)) {
				continue;
			}
			const matches = withSteps.steps.some((step) => {
				if (!step || typeof step !== 'object') {
					return false;
				}
				const triggers = (
					step as {
						triggers?: readonly string[];
					}
				).triggers;
				return triggers?.includes(triggerId) ?? false;
			});
			if (matches) {
				return phase as PhaseDef;
			}
		}
		return undefined;
	};

	const fromLegacy = findPhaseWithTrigger(ctx.legacy?.phases);
	if (fromLegacy) {
		return toPassivePhaseInfo(fromLegacy);
	}
	const fromContext = findPhaseWithTrigger(ctx.phases as unknown[]);
	if (fromContext) {
		return toPassivePhaseInfo(fromContext);
	}
	const fromContents = findPhaseWithTrigger(PHASES);
	return toPassivePhaseInfo(fromContents);
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
