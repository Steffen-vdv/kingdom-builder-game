import type { EffectDef } from '@kingdom-builder/protocol';
import { formatDetailText } from '../../utils/stats/format';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';
import type { TranslationContext } from '../context';

const DEFAULT_TRIGGER_INFO: Record<
	string,
	{ icon?: string; future?: string; past?: string }
> = {
	onBuild: { icon: '⚒️', future: 'Until removed', past: 'Build' },
	onBeforeAttacked: {
		icon: '🛡️',
		future: 'Before being attacked',
		past: 'Before attack',
	},
	onAttackResolved: {
		icon: '⚔️',
		future: 'After attack resolves',
		past: 'After attack',
	},
	onPayUpkeepStep: {
		icon: '🧹',
		future: 'During upkeep step',
		past: 'Upkeep step',
	},
	onGainIncomeStep: {
		icon: '💰',
		future: 'During Growth Phase — Gain Income step',
		past: 'Growth Phase — Gain Income step',
	},
	onGainAPStep: { icon: '⚡', future: 'During AP step', past: 'AP step' },
};

function selectTriggerInfo(
	context: TranslationContext,
	key: string,
): { icon?: string; future?: string; past?: string } {
	return context.assets.triggers[key] ?? DEFAULT_TRIGGER_INFO[key] ?? {};
}

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
			const phaseLabel = [phase.icon, phase.label ?? formatDetailText(phase.id)]
				.filter((part) => part && String(part).trim().length > 0)
				.join(' ')
				.trim();
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
			const info = selectTriggerInfo(context, identifier);
			const stepLabel = formatStepTriggerLabel(context, identifier);
			const title = (() => {
				if (stepLabel) {
					const trimmedIcon = (info.icon ?? '').trim();
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
			const phaseIcon = (phase.icon ?? '').trim();
			const rawPhaseLabel = phase.label ?? formatDetailText(phase.id);
			const normalizedPhaseLabel = rawPhaseLabel
				? rawPhaseLabel.trim().replace(/\s+/gu, ' ')
				: formatDetailText(phase.id);
			const phaseLabel =
				normalizedPhaseLabel.length > 0
					? normalizedPhaseLabel
					: formatDetailText(phase.id);
			const iconPrefix = phaseIcon.length ? `${phaseIcon} ` : '';
			const phaseTitle = `${iconPrefix}On each ${phaseLabel} Phase`.trim();
			applyTrigger(phaseKey, phaseTitle);
		}

		const triggerKeys = new Set<string>([
			...Object.keys(DEFAULT_TRIGGER_INFO),
			...Object.keys(context.assets.triggers),
		]);
		const stepKeysFromInfo = Array.from(triggerKeys).filter((key) =>
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
