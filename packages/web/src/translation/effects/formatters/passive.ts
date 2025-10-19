import {
	registerEffectFormatter,
	summarizeEffects,
	describeEffects,
} from '../factory';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { TranslationContext, TranslationPhase } from '../../context';
import { selectPassiveDescriptor } from '../registrySelectors';

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

function toPhaseInfo(
	phase: TranslationPhase | PassivePhaseInfo | undefined,
): PassivePhaseInfo | undefined {
	if (!phase) {
		return undefined;
	}
	const info: PassivePhaseInfo = { id: phase.id };
	if ('label' in phase && phase.label !== undefined) {
		info.label = phase.label;
	}
	if ('icon' in phase && phase.icon !== undefined) {
		info.icon = phase.icon;
	}
	return info;
}

function resolvePhaseMeta(
	context: TranslationContext,
	id: string | undefined,
): PassivePhaseInfo | undefined {
	if (!id) {
		return undefined;
	}
	const match = context.phases.find((phase) => phase.id === id);
	return toPhaseInfo(match);
}

const PHASE_TRIGGER_KEY_PATTERN = /^on[A-Z][A-Za-z0-9]*Phase$/;

function humanizePhaseId(id: string): string {
	const slug = id.split(':').pop() ?? id;
	return slug
		.split(/[-_]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function resolvePhaseByTrigger(
	context: TranslationContext,
	triggerId: string,
): PassivePhaseInfo | undefined {
	for (const phase of context.phases) {
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
			return toPhaseInfo(phase);
		}
	}
	return undefined;
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
		if (phaseId) {
			label = humanizePhaseId(phaseId);
			source = source ?? 'phase';
		} else {
			return null;
		}
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
		const descriptor = selectPassiveDescriptor(context);
		const icon =
			(effect.params?.['icon'] as string | undefined) ?? descriptor.icon ?? '';
		const name =
			(effect.params?.['name'] as string | undefined) ??
			descriptor.label ??
			'Passive';
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
		const descriptor = selectPassiveDescriptor(context);
		const icon =
			(effect.params?.['icon'] as string | undefined) ?? descriptor.icon ?? '';
		const name =
			(effect.params?.['name'] as string | undefined) ??
			descriptor.label ??
			'Passive';
		const trimmedIcon = icon.trim();
		const generalPassiveIcon = context.assets.passive.icon?.trim() || '♾️';
		const nameLabel = name.trim();
		const labelParts: string[] = [generalPassiveIcon].filter(
			(part) => part.length > 0,
		);
		if (trimmedIcon.length > 0 && trimmedIcon !== generalPassiveIcon) {
			labelParts.push(trimmedIcon);
		}
		if (nameLabel.length > 0) {
			labelParts.push(nameLabel);
		}
		const decoratedLabel = labelParts.join(' ').trim();
		const inner = describeEffects(effect.effects || [], context);
		const duration = resolveDurationMeta(effect, context);
		const items = [...inner];
		if (duration) {
			const durationLabel = formatDuration(duration);
			const durationPrefix = icon ? `${icon} ` : '';
			const durationDescription =
				`${durationPrefix}Duration: Until player's next ${durationLabel}`.trim();
			items.push(durationDescription);
		}
		if (decoratedLabel.length === 0) {
			return items;
		}
		if (items.length === 0) {
			return `${decoratedLabel} activated`;
		}
		return [
			{
				title: `${decoratedLabel} activated`,
				items,
			},
		];
	},
});
