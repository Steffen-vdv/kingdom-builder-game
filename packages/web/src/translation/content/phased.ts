import type { EffectDef } from '@kingdom-builder/protocol';
import { formatDetailText } from '../../utils/stats/format';
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
			const info = selectTriggerDisplay(context.assets, key as string);
			const stepLabel = formatStepTriggerLabel(context, identifier);
			const title = (() => {
				if (stepLabel) {
					const icon = info.icon ?? '';
					const trimmedIcon = icon.trim();
					const prefix = trimmedIcon.length ? `${trimmedIcon} ` : '';
					return `${prefix}During ${stepLabel}`;
				}
				const future = info.future ?? info.label;
				const icon = info.icon ?? '';
				if (future && future.trim().length) {
					const parts = [icon, future].filter(Boolean).join(' ').trim();
					if (parts.length) {
						return parts;
					}
				}
				return fallbackTitle;
			})();
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

		const stepTriggerKeys: string[] = [];
		const registerStepKey = (key: string | undefined) => {
			if (typeof key !== 'string') {
				return;
			}
			const trimmed = key.trim();
			if (trimmed.length === 0) {
				return;
			}
			if (!trimmed.toLowerCase().endsWith('step')) {
				return;
			}
			if (!stepTriggerKeys.includes(trimmed)) {
				stepTriggerKeys.push(trimmed);
			}
		};
		for (const phase of context.phases) {
			for (const step of phase.steps ?? []) {
				for (const trigger of step.triggers ?? []) {
					registerStepKey(trigger);
				}
			}
		}
		for (const key of Object.keys(context.assets?.triggers ?? {})) {
			registerStepKey(key);
		}
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
