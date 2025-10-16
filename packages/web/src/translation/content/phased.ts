import type { EffectDef } from '@kingdom-builder/protocol';
import { formatDetailText } from '../../utils/stats/format';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';
import type { TranslationContext, TranslationTriggerAsset } from '../context';
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

function composePhaseTitle(
	phase: TranslationContext['phases'][number],
): string | undefined {
	const icon = typeof phase.icon === 'string' ? phase.icon.trim() : '';
	const labelSource = phase.label ?? formatDetailText(phase.id);
	const label =
		typeof labelSource === 'string'
			? labelSource.trim().replace(/\s+/gu, ' ')
			: '';
	if (label.length === 0 && icon.length === 0) {
		return undefined;
	}
	if (label.length === 0) {
		return icon.length > 0 ? icon : undefined;
	}
	const prefix = icon.length > 0 ? `${icon} ` : '';
	return `${prefix}On each ${label} Phase`.trim();
}

function composeTriggerAssetTitle(
	asset: TranslationTriggerAsset | undefined,
): string | undefined {
	const icon = typeof asset?.icon === 'string' ? asset.icon.trim() : '';
	const futureOrLabel = asset?.future ?? asset?.label;
	if (typeof futureOrLabel !== 'string') {
		return undefined;
	}
	const trimmedLabel = futureOrLabel.trim();
	if (trimmedLabel.length === 0) {
		return undefined;
	}
	if (icon.length === 0) {
		return trimmedLabel;
	}
	return `${icon} ${trimmedLabel}`.trim();
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
			presetInfo?: TranslationTriggerAsset,
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
			const info =
				presetInfo ?? selectTriggerDisplay(context.assets, identifier);
			const stepLabel = formatStepTriggerLabel(context, identifier);
			const icon = typeof info.icon === 'string' ? info.icon.trim() : '';
			const title = (() => {
				if (stepLabel) {
					const prefix = icon.length > 0 ? `${icon} ` : '';
					return `${prefix}During ${stepLabel}`.trim();
				}
				const assetTitle = composeTriggerAssetTitle(info);
				if (assetTitle) {
					return assetTitle;
				}
				if (fallbackTitle) {
					const trimmedFallback = fallbackTitle.trim();
					if (trimmedFallback.length > 0) {
						return trimmedFallback;
					}
				}
				return undefined;
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
			const info = selectTriggerDisplay(context.assets, phaseKey as string);
			const fallbackTitle =
				composePhaseTitle(phase) ?? composeTriggerAssetTitle(info);
			applyTrigger(phaseKey, fallbackTitle, info);
		}

		const triggerLookup = context.assets?.triggers ?? {};
		const stepKeysFromInfo = Object.keys(triggerLookup).filter((key) =>
			key.endsWith('Step'),
		);
		for (const key of stepKeysFromInfo) {
			const info = triggerLookup[key];
			const fallbackTitle = composeTriggerAssetTitle(info) ?? key;
			applyTrigger(key as keyof PhasedDef, fallbackTitle, info);
		}

		const beforeAttackedInfo = selectTriggerDisplay(
			context.assets,
			'onBeforeAttacked',
		);
		applyTrigger(
			'onBeforeAttacked',
			composeTriggerAssetTitle(beforeAttackedInfo) ?? 'onBeforeAttacked',
			beforeAttackedInfo,
		);

		const attackResolvedInfo = selectTriggerDisplay(
			context.assets,
			'onAttackResolved',
		);
		applyTrigger(
			'onAttackResolved',
			composeTriggerAssetTitle(attackResolvedInfo) ?? 'onAttackResolved',
			attackResolvedInfo,
		);

		for (const key of Object.keys(phasedDefinition)) {
			if (key === 'onBuild' || handled.has(key)) {
				continue;
			}
			if (!key.startsWith('on')) {
				continue;
			}
			const info = selectTriggerDisplay(context.assets, key);
			applyTrigger(
				key as keyof PhasedDef,
				composeTriggerAssetTitle(info) ?? key,
				info,
			);
		}

		return root;
	}
}
