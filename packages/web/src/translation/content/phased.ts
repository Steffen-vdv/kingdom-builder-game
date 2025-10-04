import type { EngineContext, EffectDef } from '@kingdom-builder/engine';
import { TRIGGER_INFO as triggerInfo } from '@kingdom-builder/contents';
import { summarizeEffects, describeEffects } from '../effects';
import type { Summary, SummaryEntry } from './types';

export interface PhasedDef {
	onBuild?: EffectDef<Record<string, unknown>>[] | undefined;
	onBeforeAttacked?: EffectDef<Record<string, unknown>>[] | undefined;
	onAttackResolved?: EffectDef<Record<string, unknown>>[] | undefined;
	[key: string]: EffectDef<Record<string, unknown>>[] | undefined;
}

export class PhasedTranslator {
	summarize(def: PhasedDef, ctx: EngineContext): Summary {
		return this.translate(def, ctx, summarizeEffects);
	}

	describe(def: PhasedDef, ctx: EngineContext): Summary {
		return this.translate(def, ctx, describeEffects);
	}

	private translate(
		def: PhasedDef,
		ctx: EngineContext,
		effectMapper: (
			effects: readonly EffectDef<Record<string, unknown>>[] | undefined,
			context: EngineContext,
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
			const title = (() => {
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
