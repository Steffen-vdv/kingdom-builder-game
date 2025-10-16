import type { EffectDef } from '@kingdom-builder/protocol';
import { formatDetailText } from '../../utils/stats/format';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';
import type { TranslationContext } from '../context';
import { selectTriggerDisplay } from '../context/assetSelectors';

/**
 * Builds a human-readable label describing the phase and step that contains the given trigger key.
 *
 * @param context - Translation context containing phases and their steps
 * @param triggerKey - Trigger identifier to locate within steps
 * @returns The composed label (e.g. "Icon PhaseLabel Phase — StepTitle step") when the trigger is found and at least one label component exists, `undefined` otherwise
 */
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
			const phaseParts = [phase.icon, phase.label ?? formatDetailText(phase.id)]
				.filter((value) => typeof value === 'string' && value.trim().length > 0)
				.map((value) => value!.trim());
			const phaseLabel = phaseParts.join(' ');
			const stepLabel = (step.title ?? formatDetailText(step.id))
				?.trim()
				.replace(/\s+/gu, ' ');
			const sections: string[] = [];
			if (phaseLabel.length) {
				sections.push(`${phaseLabel} Phase`);
			}
			if (stepLabel && stepLabel.length) {
				sections.push(`${stepLabel} step`);
			}
			if (sections.length === 0) {
				return undefined;
			}
			return sections.join(' — ');
		}
	}
	return undefined;
}

/**
 * Trim a string and normalize empty or non-string inputs to `undefined`.
 *
 * @param value - The input string to normalize; may be `undefined`
 * @returns The trimmed string, or `undefined` if `value` is not a string or is empty after trimming
 */
function sanitize(value: string | undefined): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Compose an icon and a label into a single trimmed string when either value is present.
 *
 * @param icon - Optional icon text to prefix (e.g., an emoji or short symbol)
 * @param label - Optional descriptive text to follow the icon
 * @returns The combined "`icon label`" when both are present, the single non-empty part when only one is present, or `undefined` when neither is provided
 */
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

/**
 * Build a human-readable trigger title from display metadata, step context, and fallbacks.
 *
 * @param identifier - The trigger identifier used as a last-resort detail when no display text is available.
 * @param display - Trigger display metadata (icon, future, label, past) from asset selectors.
 * @param fallbackTitle - An optional fallback title to use when display fields are absent.
 * @param stepLabel - An optional step label; when provided, the title will be formatted as "During <stepLabel>".
 * @returns The resolved human-readable trigger title, or `undefined` if no title can be produced.
 */
function formatTriggerTitle(
	identifier: string,
	display: ReturnType<typeof selectTriggerDisplay>,
	fallbackTitle: string | undefined,
	stepLabel: string | undefined,
): string | undefined {
	const icon = sanitize(display.icon);
	const future = sanitize(display.future);
	const label = sanitize(display.label);
	const past = sanitize(display.past);
	const fallback = sanitize(fallbackTitle);
	if (stepLabel) {
		return (
			composeIconLabel(icon, `During ${stepLabel}`) ?? `During ${stepLabel}`
		);
	}
	if (future) {
		return composeIconLabel(icon, future) ?? future;
	}
	if (label) {
		return composeIconLabel(icon, label) ?? label;
	}
	if (past) {
		return composeIconLabel(icon, past) ?? past;
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

/**
 * Resolve a human-readable title for a phased trigger using available display and step context.
 *
 * @param context - Translation context used to look up assets and phase/step information
 * @param identifier - Trigger key to resolve a title for
 * @param fallbackTitle - Optional fallback title to use when no display title is available
 * @returns The resolved trigger title (including phase/step context when available) or `undefined` if no title can be derived
 */
export function resolvePhasedTriggerTitle(
	context: TranslationContext,
	identifier: string,
	fallbackTitle?: string,
): string | undefined {
	const display = selectTriggerDisplay(context.assets, identifier);
	const stepLabel = formatStepTriggerLabel(context, identifier);
	return formatTriggerTitle(identifier, display, fallbackTitle, stepLabel);
}

/**
 * Collects trigger keys corresponding to step-based triggers from the translation context.
 *
 * @param context - Translation context containing asset trigger definitions and phase/step entries
 * @returns An array of unique trigger keys that end with `Step`, gathered from `context.assets.triggers` and from each phase's step `triggers`
 */
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