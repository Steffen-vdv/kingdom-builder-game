import type { EffectDef } from '@kingdom-builder/protocol';
import { formatDetailText } from '../../utils/resourceSources/format';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';
import type { TranslationContext } from '../context';
import { selectTriggerDisplay } from '../context/assetSelectors';

function formatStepTriggerLabel(
	context: TranslationContext,
	triggerKey: string,
): string | undefined {
	for (const phase of context.phases) {
		const steps = phase.steps ?? [];
		for (const step of steps) {
			const triggers = step.triggers ?? [];
			if (!triggers.includes(triggerKey)) {
				continue;
			}
			// Concise format: just phase icon + label, no step text
			const phaseParts = [phase.icon, phase.label ?? formatDetailText(phase.id)]
				.filter((value) => typeof value === 'string' && value.trim().length > 0)
				.map((value) => value!.trim());
			const phaseLabel = phaseParts.join(' ');
			if (!phaseLabel.length) {
				return undefined;
			}
			return `${phaseLabel} Phase`;
		}
	}
	return undefined;
}

function sanitize(value: string | undefined): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function composeIconLabel(
	icon: string | undefined,
	label: string | undefined,
): string | undefined {
	const iconPart = sanitize(icon);
	const labelPart = sanitize(label);
	if (!iconPart && !labelPart) {
		return undefined;
	}
	if (iconPart && labelPart) {
		return `${iconPart} ${labelPart}`.trim();
	}
	return iconPart ?? labelPart ?? undefined;
}

function formatTriggerTitle(
	identifier: string,
	display: ReturnType<typeof selectTriggerDisplay>,
	fallbackTitle: string | undefined,
	stepLabel: string | undefined,
): string | undefined {
	const icon = sanitize(display.icon);
	const text = sanitize(display.text);
	const label = sanitize(display.label);
	const fallback = sanitize(fallbackTitle);
	// Step triggers use "On your <Phase> Phase" format
	if (stepLabel) {
		return `On your ${stepLabel}`;
	}
	// Event triggers use icon + text format (e.g., "⚔️ Before being attacked")
	if (text) {
		return composeIconLabel(icon, text) ?? text;
	}
	if (label) {
		return composeIconLabel(icon, label) ?? label;
	}
	if (fallback) {
		if (icon && !fallback.includes(icon)) {
			return composeIconLabel(icon, fallback) ?? fallback;
		}
		return fallback;
	}
	const detail = sanitize(formatDetailText(identifier));
	if (detail) {
		return composeIconLabel(icon, detail) ?? detail;
	}
	return composeIconLabel(icon, identifier) ?? identifier;
}

export function resolvePhasedTriggerTitle(
	context: TranslationContext,
	identifier: string,
	fallbackTitle?: string,
): string | undefined {
	const display = selectTriggerDisplay(context.assets, identifier);
	const stepLabel = formatStepTriggerLabel(context, identifier);
	return formatTriggerTitle(identifier, display, fallbackTitle, stepLabel);
}

function collectStepTriggerKeys(context: TranslationContext): string[] {
	const keys = new Set<string>();
	const triggerLookup = context.assets?.triggers ?? {};
	for (const key of Object.keys(triggerLookup)) {
		if (key.endsWith('Step')) {
			keys.add(key);
		}
	}
	for (const phase of context.phases) {
		const steps = phase.steps ?? [];
		for (const step of steps) {
			const triggers = step.triggers ?? [];
			for (const trigger of triggers) {
				if (typeof trigger === 'string' && trigger.endsWith('Step')) {
					keys.add(trigger);
				}
			}
		}
	}
	return [...keys];
}

export interface PhasedDef {
	onBuild?: EffectDef<Record<string, unknown>>[] | undefined;
	onBeforeAttacked?: EffectDef<Record<string, unknown>>[] | undefined;
	onAttackResolved?: EffectDef<Record<string, unknown>>[] | undefined;
	[key: string]: EffectDef<Record<string, unknown>>[] | undefined;
}

type PhaseEffectList =
	| readonly EffectDef<Record<string, unknown>>[]
	| undefined;

type PhaseEffectMapper = (
	effects: PhaseEffectList,
	context: TranslationContext,
) => SummaryEntry[];

export class PhasedTranslator {
	summarize(phasedDefinition: PhasedDef, context: TranslationContext): Summary {
		const mapper = summarizeEffects;
		return this.translate(phasedDefinition, context, mapper);
	}

	describe(phasedDefinition: PhasedDef, context: TranslationContext): Summary {
		const mapper = describeEffects;
		return this.translate(phasedDefinition, context, mapper);
	}

	private translate(
		phasedDefinition: PhasedDef,
		context: TranslationContext,
		effectMapper: PhaseEffectMapper,
	): Summary {
		const root: SummaryEntry[] = [];
		const handled = new Set<string>();
		const applyTrigger = (
			key: keyof PhasedDef,
			fallbackTitle?: string,
		): void => {
			const identifier = key as string;
			if (handled.has(identifier)) {
				return;
			}
			handled.add(identifier);
			const definitionEffects = phasedDefinition[key];
			const effects = effectMapper(definitionEffects, context);
			if (!effects.length) {
				return;
			}
			const title = resolvePhasedTriggerTitle(
				context,
				identifier,
				fallbackTitle,
			);
			if (title) {
				root.push({ title, items: effects });
				return;
			}
			root.push(...effects);
		};

		const build = effectMapper(phasedDefinition.onBuild, context);
		if (build.length) {
			root.push(...build);
		}
		handled.add('onBuild');

		for (const phase of context.phases) {
			const capitalizedPhaseId =
				phase.id.charAt(0).toUpperCase() + phase.id.slice(1);
			const phaseKey = `on${capitalizedPhaseId}Phase` as keyof PhasedDef;
			const icon = phase.icon ? `${phase.icon} ` : '';
			const label = phase.label ?? formatDetailText(phase.id);
			const phaseTitle = `${icon}On each ${label} Phase`.trim();
			applyTrigger(phaseKey, phaseTitle);
		}

		const stepTriggerKeys = collectStepTriggerKeys(context);
		for (const key of stepTriggerKeys) {
			applyTrigger(key as keyof PhasedDef, key);
		}

		applyTrigger('onBeforeAttacked');
		applyTrigger('onAttackResolved');

		for (const key of Object.keys(phasedDefinition)) {
			if (key === 'onBuild' || handled.has(key)) {
				continue;
			}
			if (!key.startsWith('on')) {
				continue;
			}
			applyTrigger(key as keyof PhasedDef, key);
		}

		return root;
	}
}
