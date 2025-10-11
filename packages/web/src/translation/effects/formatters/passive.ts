import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import type { EffectDef, PhaseDef } from '@kingdom-builder/protocol';
import type { TranslationContext, TranslationPhaseAsset } from '../../context';
import { resolvePassiveDisplay } from '../helpers';

type PassiveDurationMeta = {
	label: string;
	icon?: string;
	phaseId?: string;
	source: 'manual' | 'phase';
};

function createMeta(metadata: PassiveDurationMeta): PassiveDurationMeta {
	const result: PassiveDurationMeta = {
		label: metadata.label,
		source: metadata.source,
	};
	if (metadata.icon !== undefined) {
		result.icon = metadata.icon;
	}
	if (metadata.phaseId !== undefined) {
		result.phaseId = metadata.phaseId;
	}
	return result;
}

type PassivePhaseInfo = { id: string; label?: string; icon?: string };
type PhaseStepMetadata = { triggers?: readonly string[] };
type PassivePhaseWithSteps = PassivePhaseInfo & {
	steps?: readonly PhaseStepMetadata[];
};
type PhaseWithStepMetadata = PhaseDef | PassivePhaseWithSteps;

type PassivePhaseSource = PhaseDef | PassivePhaseInfo | TranslationPhaseAsset;

function mergePhaseInfo(
	id: string,
	...sources: Array<PassivePhaseSource | undefined>
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
	context: TranslationContext,
	id: string | undefined,
): PassivePhaseInfo | undefined {
	if (!id) {
		return undefined;
	}
	const fromContext = context.phases.find((phase) => phase.id === id);
	const fromAssets = context.assets?.phases?.[id];
	return mergePhaseInfo(id, fromContext, fromAssets);
}

const PHASE_TRIGGER_KEY_PATTERN = /^on[A-Z][A-Za-z0-9]*Phase$/;

function resolvePhaseByTrigger(
	context: TranslationContext,
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

	const fromContext = findPhaseWithTrigger(context.phases);
	if (fromContext) {
		const fromAssets = context.assets?.phases?.[fromContext.id];
		return mergePhaseInfo(fromContext.id, fromContext, fromAssets);
	}
	const fromAssets = Object.entries(context.assets?.phases ?? {}).find(
		([, phase]) =>
			Array.isArray(phase?.triggers)
				? phase.triggers.includes(triggerId)
				: false,
	);
	if (!fromAssets) {
		return undefined;
	}
	const [phaseId, assetPhase] = fromAssets;
	return mergePhaseInfo(phaseId, assetPhase);
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
	effect: EffectDef<Record<string, unknown>>,
	context: TranslationContext,
): PassiveDurationMeta | null {
	const params = effect.params ?? {};
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

	let resolvedPhase = resolvePhaseMeta(context, durationPhaseId);

	const triggerKeys = collectPhaseTriggerKeys(params);
	if (!resolvedPhase) {
		for (const triggerId of triggerKeys) {
			const phase = resolvePhaseByTrigger(context, triggerId);
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

function formatDuration(metadata: PassiveDurationMeta) {
	const icon = metadata.icon ? `${metadata.icon} ` : '';
	return `${icon}${metadata.label}`;
}

registerEffectFormatter('passive', 'add', {
	summarize: (effect, context) => {
		const inner = summarizeEffects(effect.effects || [], context);
		const duration = resolveDurationMeta(effect, context);
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
	describe: (effect, context) => {
		const passiveDisplay = resolvePassiveDisplay(context);
		const icon =
			(effect.params?.['icon'] as string | undefined) ?? passiveDisplay.icon;
		const name =
			(effect.params?.['name'] as string | undefined) ?? passiveDisplay.label;
		const prefix = icon ? `${icon} ` : '';
		const inner = describeEffects(effect.effects || [], context);
		const duration = resolveDurationMeta(effect, context);
		if (!duration) {
			return inner;
		}
		const durationLabel = formatDuration(duration);
		const durationTitle = `${prefix}${name} – Until your next ${durationLabel}`;
		return [
			{
				title: durationTitle,
				items: inner,
			},
		];
	},
	log: (effect, context) => {
		const passiveDisplay = resolvePassiveDisplay(context);
		const icon =
			(effect.params?.['icon'] as string | undefined) ?? passiveDisplay.icon;
		const name =
			(effect.params?.['name'] as string | undefined) ?? passiveDisplay.label;
		const prefix = icon ? `${icon} ` : '';
		const label = `${prefix}${name}`.trim();
		const inner = describeEffects(effect.effects || [], context);
		const duration = resolveDurationMeta(effect, context);
		const items = [...inner];
		if (duration) {
			const durationLabel = formatDuration(duration);
			const durationDescription = `${prefix}${name} duration: Until player's next ${durationLabel}`;
			items.push(durationDescription);
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
