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

/**
 * Find param keys that are known trigger IDs by checking against
 * the trigger metadata map from the translation context.
 */
function collectTriggerKeys(
	params: Record<string, unknown>,
	context: TranslationContext,
): string[] {
	const triggerMap = context.assets.triggers;
	return Object.keys(params).filter((key) => {
		if (params[key] === undefined) {
			return false;
		}
		return key in triggerMap;
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

	const triggerKeys = collectTriggerKeys(params, context);
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

function formatPassiveLabel(
	effect: EffectDef<Record<string, unknown>>,
	context: TranslationContext,
): { icon: string; name: string } {
	const descriptor = selectPassiveDescriptor(context);
	const icon =
		(effect.params?.['icon'] as string | undefined) ?? descriptor.icon ?? '';
	const name =
		(effect.params?.['name'] as string | undefined) ??
		descriptor.label ??
		'Passive';
	return { icon, name };
}

function formatTriggerPrefix(duration: PassiveDurationMeta): string {
	const phaseIcon = duration.icon ? `${duration.icon} ` : '';
	return `On your ${phaseIcon}${duration.label} Phase`;
}

registerEffectFormatter('passive', 'add', {
	summarize: (effect, context) => {
		const inner = summarizeEffects(effect.effects || [], context);
		const duration = resolveDurationMeta(effect, context);
		const { icon, name } = formatPassiveLabel(effect, context);
		if (!duration) {
			return inner;
		}
		// Split into two entries:
		// 1. "+♾️: <icon> <name>" with child effects
		// 2. "On your <phase icon> <Phase> Phase" with "-♾️: <icon> <name>" removal
		const addLabel = icon ? `+♾️: ${icon} ${name}` : `+♾️: ${name}`;
		const removeLabel = icon ? `-♾️: ${icon} ${name}` : `-♾️: ${name}`;
		const triggerTitle = formatTriggerPrefix(duration);
		return [
			{ title: addLabel, items: inner },
			{ title: triggerTitle, items: [removeLabel] },
		];
	},
	describe: (effect, context) => {
		const inner = describeEffects(effect.effects || [], context);
		const duration = resolveDurationMeta(effect, context);
		const { icon, name } = formatPassiveLabel(effect, context);
		if (!duration) {
			return inner;
		}
		// Split into two entries:
		// 1. "Gain ♾️ Passive: <icon> <name>" with child effects
		// 2. "On your <Phase> Phase" with "Remove ♾️ Passive: ..."
		const addLabel = icon
			? `Gain ♾️ Passive: ${icon} ${name}`
			: `Gain ♾️ Passive: ${name}`;
		const removeLabel = icon
			? `Remove ♾️ Passive: ${icon} ${name}`
			: `Remove ♾️ Passive: ${name}`;
		const triggerTitle = formatTriggerPrefix(duration);
		return [
			{ title: addLabel, items: inner },
			{ title: triggerTitle, items: [removeLabel] },
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
		const prefix = icon ? `${icon} ` : '';
		const label = `${prefix}${name}`.trim();
		const activationLabel = label.length
			? `♾️ ${label} activated`
			: '♾️ Passive activated';
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
		if (!label) {
			return items;
		}
		if (items.length === 0) {
			return activationLabel;
		}
		return [
			{
				title: activationLabel,
				items,
			},
		];
	},
});
