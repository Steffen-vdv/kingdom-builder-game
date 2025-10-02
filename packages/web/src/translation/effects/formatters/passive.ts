import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import { PHASES, PASSIVE_INFO } from '@kingdom-builder/contents';
import type { EffectDef, EngineContext } from '@kingdom-builder/engine';

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
	if (meta.icon !== undefined) result.icon = meta.icon;
	if (meta.phaseId !== undefined) result.phaseId = meta.phaseId;
	return result;
}

function resolvePhaseMeta(ctx: EngineContext, id: string | undefined) {
	if (!id) return undefined;
	return (
		ctx.phases.find((phase) => phase.id === id) ??
		PHASES.find((p) => p.id === id)
	);
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
	let source: PassiveDurationMeta['source'] | undefined;
	let phaseId: string | undefined;

	if (durationPhaseId) {
		phaseId = durationPhaseId;
		const phase = resolvePhaseMeta(ctx, durationPhaseId);
		if (!label && phase?.label) {
			label = phase.label;
			source = 'phase';
		}
		if (!icon && phase?.icon) icon = phase.icon;
	}

	if (!label && params['onUpkeepPhase']) {
		phaseId = 'upkeep';
		const phase = resolvePhaseMeta(ctx, 'upkeep');
		if (phase?.label) {
			label = phase.label;
			source = 'phase';
		} else {
			label = 'Upkeep';
			source = 'fallback';
		}
		if (!icon && phase?.icon) icon = phase.icon;
	}

	if (label) {
		if (!source) source = manualLabel ? 'manual' : 'phase';
		return createMeta({
			label,
			...(icon !== undefined ? { icon } : {}),
			...(phaseId !== undefined ? { phaseId } : {}),
			source,
		});
	}

	if (icon) {
		if (phaseId) {
			const phase = resolvePhaseMeta(ctx, phaseId);
			if (phase?.label) {
				return createMeta({
					label: phase.label,
					icon,
					phaseId,
					source: source ?? 'phase',
				});
			}
		}
		if (params['onUpkeepPhase']) {
			return createMeta({
				label: 'Upkeep',
				icon,
				phaseId: 'upkeep',
				source: 'fallback',
			});
		}
	}

	return null;
}

function formatDuration(
	meta: PassiveDurationMeta,
	{ includePhase }: { includePhase: boolean },
) {
	const icon = meta.icon ? `${meta.icon} ` : '';
	const suffix =
		includePhase && meta.source !== 'manual' && meta.phaseId ? ' Phase' : '';
	return `${icon}${meta.label}${suffix}`;
}

registerEffectFormatter('passive', 'add', {
	summarize: (eff, ctx) => {
		const inner = summarizeEffects(eff.effects || [], ctx);
		const duration = resolveDurationMeta(eff, ctx);
		if (!duration) return inner;
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
		if (!duration) return inner;
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
		if (duration)
			items.push(
				`${prefix}${name} duration: Until player's next ${formatDuration(
					duration,
					{ includePhase: true },
				)}`,
			);
		return { title: `${prefix}${name} added`, items };
	},
});
