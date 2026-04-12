import type { EffectDef } from '@boardsmith/protocol';
import { formatDetailText } from '../../utils/resourceSources/format';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';
import type { TranslationContext } from '../context';
import { selectTriggerDisplay } from '../context/assetSelectors';

interface StepTriggerInfo {
	label: string;
	icon?: string;
}

function getStepTriggerInfo(
	context: TranslationContext,
	triggerKey: string,
): StepTriggerInfo | undefined {
	for (const phase of context.phases) {
		const steps = phase.steps ?? [];
		for (const step of steps) {
			const triggers = step.triggers ?? [];
			if (!triggers.includes(triggerKey)) {
				continue;
			}
			const label = phase.label ?? formatDetailText(phase.id);
			if (!label?.trim()) {
				return undefined;
			}
			const result: StepTriggerInfo = {
				label: `${label.trim()} Phase`,
			};
			const icon = phase.icon?.trim();
			if (icon) {
				result.icon = icon;
			}
			return result;
		}
	}
	return undefined;
}

function formatStepTriggerLabel(
	context: TranslationContext,
	triggerKey: string,
): string | undefined {
	const info = getStepTriggerInfo(context, triggerKey);
	if (!info) {
		return undefined;
	}
	const parts = [info.icon, info.label].filter(Boolean);
	return parts.join(' ');
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

/**
 * Appends phase suffix to effect entries.
 * - Summarize: "🪙 +2 per 🌱 Growth Phase"
 * - Describe: "Gain 🪙 +2 Gold each 🌱 Growth Phase"
 */
function appendPhaseSuffix(
	effects: SummaryEntry[],
	phaseInfo: StepTriggerInfo,
	mode: 'summarize' | 'describe',
): SummaryEntry[] {
	const phaseSuffix = phaseInfo.icon
		? `${phaseInfo.icon} ${phaseInfo.label}`
		: phaseInfo.label;
	const prefix = mode === 'summarize' ? 'per' : 'each';
	const suffix = ` ${prefix} ${phaseSuffix}`;

	return effects.map((entry) => {
		if (typeof entry === 'string') {
			return `${entry}${suffix}`;
		}
		// For nested entries, append suffix to title
		return {
			...entry,
			title: `${entry.title}${suffix}`,
		};
	});
}

export class PhasedTranslator {
	summarize(phasedDefinition: PhasedDef, context: TranslationContext): Summary {
		const mapper = summarizeEffects;
		return this.translate(phasedDefinition, context, mapper, 'summarize');
	}

	describe(phasedDefinition: PhasedDef, context: TranslationContext): Summary {
		const mapper = describeEffects;
		return this.translate(phasedDefinition, context, mapper, 'describe');
	}

	private translate(
		phasedDefinition: PhasedDef,
		context: TranslationContext,
		effectMapper: PhaseEffectMapper,
		mode: 'summarize' | 'describe',
	): Summary {
		const root: SummaryEntry[] = [];
		const handled = new Set<string>();

		/**
		 * Applies step trigger with inline phase suffix.
		 * Effects become "🪙 +2 per 🌱 Growth Phase" instead of nested sections.
		 */
		const applyStepTrigger = (triggerKey: string): void => {
			if (handled.has(triggerKey)) {
				return;
			}
			handled.add(triggerKey);
			const definitionEffects = phasedDefinition[triggerKey as keyof PhasedDef];
			const effects = effectMapper(definitionEffects, context);
			if (!effects.length) {
				return;
			}
			const phaseInfo = getStepTriggerInfo(context, triggerKey);
			if (phaseInfo) {
				// Inline phase suffix with each effect
				root.push(...appendPhaseSuffix(effects, phaseInfo, mode));
			} else {
				// Fallback: use trigger display as section title
				const title = resolvePhasedTriggerTitle(context, triggerKey);
				if (title) {
					root.push({ title, items: effects });
				} else {
					root.push(...effects);
				}
			}
		};

		/**
		 * Applies event trigger with section grouping.
		 * Events like combat triggers remain grouped: "⚔️ Before attack: [effects]"
		 */
		const applyEventTrigger = (
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

		// onBuild effects are added directly (no wrapper needed)
		const build = effectMapper(phasedDefinition.onBuild, context);
		if (build.length) {
			root.push(...build);
		}
		handled.add('onBuild');

		// Step triggers: inline phase suffix with effects
		const stepTriggerKeys = collectStepTriggerKeys(context);
		for (const key of stepTriggerKeys) {
			applyStepTrigger(key);
		}

		// Event triggers: keep section grouping
		applyEventTrigger('onBeforeAttacked');
		applyEventTrigger('onAttackResolved');

		// Handle any remaining triggers
		for (const key of Object.keys(phasedDefinition)) {
			if (key === 'onBuild' || handled.has(key)) {
				continue;
			}
			if (!key.startsWith('on')) {
				continue;
			}
			// Check if it's a step trigger or event trigger
			const phaseInfo = getStepTriggerInfo(context, key);
			if (phaseInfo) {
				applyStepTrigger(key);
			} else {
				applyEventTrigger(key as keyof PhasedDef, key);
			}
		}

		return root;
	}
}
