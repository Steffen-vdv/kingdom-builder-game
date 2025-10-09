import type { EffectDef } from '@kingdom-builder/protocol';
import { TRIGGER_INFO as triggerInfo, PHASES } from '@kingdom-builder/contents';
import { formatDetailText } from '../../utils/stats/format';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';
import type { TranslationContext } from '../context';

function formatStepTriggerLabel(
	context: TranslationContext,
	triggerKey: string,
): string | undefined {
	const phaseMeta = new Map(
		context.phases.map((phase) => [
			phase.id,
			{ icon: phase.icon, label: phase.label },
		]),
	);
	for (const phase of PHASES) {
		const steps = phase.steps ?? [];
		for (const step of steps) {
			const triggers = step.triggers ?? [];
			if (!triggers.includes(triggerKey)) {
				continue;
			}
			const meta = phaseMeta.get(phase.id);
			const phaseLabelParts = [
				meta?.icon ?? phase.icon,
				meta?.label ?? phase.label ?? formatDetailText(phase.id),
			]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
			const stepLabelParts = (step.title ?? formatDetailText(step.id))
				?.trim()
				.replace(/\s+/gu, ' ');
			const sections: string[] = [];
			if (phaseLabelParts.length) {
				sections.push(`${phaseLabelParts} Phase`);
			}
			if (stepLabelParts && stepLabelParts.length) {
				sections.push(`${stepLabelParts} step`);
			}
			if (!sections.length) {
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
		const triggerMeta = triggerInfo as Record<
			string,
			{ icon: string; future: string } | undefined
		>;

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
			const info = triggerMeta[key as string];
			const stepLabel = formatStepTriggerLabel(context, identifier);
			const title = (() => {
				if (stepLabel) {
					const icon = info?.icon ?? '';
					const trimmedIcon = icon.trim();
					const prefix = trimmedIcon.length ? `${trimmedIcon} ` : '';
					return `${prefix}During ${stepLabel}`;
				}
				if (info) {
					const label = [info.icon, info.future]
						.filter(Boolean)
						.join(' ')
						.trim();
					if (label.length) {
						return label;
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
			const phaseTitle = `${phase.icon} On each ${phase.label} Phase`;
			applyTrigger(phaseKey, phaseTitle);
		}

		const stepKeysFromInfo = Object.keys(triggerInfo).filter((key) =>
			key.endsWith('Step'),
		);
		for (const key of stepKeysFromInfo) {
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
