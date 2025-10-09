import type { EffectDef } from '@kingdom-builder/protocol';
import { TRIGGER_INFO as triggerInfo, PHASES } from '@kingdom-builder/contents';
import { formatDetailText } from '../../utils/stats/format';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';
import type { TranslationContext } from '../context';

function formatStepTriggerLabel(
	ctx: TranslationContext,
	triggerKey: string,
): string | undefined {
	const phaseMeta = new Map(
		ctx.phases.map((phase) => [
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

export class PhasedTranslator {
	summarize(def: PhasedDef, ctx: TranslationContext): Summary {
		return this.translate(def, ctx, summarizeEffects);
	}

	describe(def: PhasedDef, ctx: TranslationContext): Summary {
		return this.translate(def, ctx, describeEffects);
	}

	private translate(
		def: PhasedDef,
		ctx: TranslationContext,
		effectMapper: (
			effects: readonly EffectDef<Record<string, unknown>>[] | undefined,
			context: TranslationContext,
		) => SummaryEntry[],
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
			const effects = effectMapper(def[key], ctx);
			if (!effects.length) {
				return;
			}
			const info = triggerMeta[key as string];
			const stepLabel = formatStepTriggerLabel(ctx, identifier);
			const title = (() => {
				if (stepLabel) {
					const prefix =
						info?.icon && info.icon.trim().length ? `${info.icon} ` : '';
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

		const build = effectMapper(def.onBuild, ctx);
		if (build.length) {
			root.push(...build);
		}
		handled.add('onBuild');

		for (const phase of ctx.phases) {
			const key =
				`on${phase.id.charAt(0).toUpperCase() + phase.id.slice(1)}Phase` as keyof PhasedDef;
			applyTrigger(key, `${phase.icon} On each ${phase.label} Phase`);
		}

		const stepKeysFromInfo = Object.keys(triggerInfo).filter((key) =>
			key.endsWith('Step'),
		);
		for (const key of stepKeysFromInfo) {
			applyTrigger(key as keyof PhasedDef, key);
		}

		applyTrigger('onBeforeAttacked');
		applyTrigger('onAttackResolved');

		for (const key of Object.keys(def)) {
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
