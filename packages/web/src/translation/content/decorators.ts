import type { ContentTranslator, Summary, TranslatorLogEntry } from './types';
import { TRIGGER_INFO as triggerInfo } from '@kingdom-builder/contents';
import type { TranslationContext } from '../context';

export function withInstallation<T>(
	translator: ContentTranslator<T, unknown>,
): ContentTranslator<T, { installed?: boolean }> {
	return {
		summarize(
			target: T,
			ctx: TranslationContext,
			opts?: { installed?: boolean },
		): Summary {
			const inner = translator.summarize(target, ctx, opts);
			if (!inner.length) {
				return [];
			}
			const main: Summary = [];
			const hoisted: Summary = [];
			for (const entry of inner) {
				if (typeof entry === 'object' && entry && '_hoist' in entry) {
					const { _hoist, ...rest } = entry as Record<string, unknown>;
					hoisted.push(rest as unknown as Summary[number]);
				} else {
					main.push(entry);
				}
			}
			const title = opts?.installed
				? `${triggerInfo.onBuild.icon} ${triggerInfo.onBuild.future}`
				: `${triggerInfo.onBuild.icon} On build, ${triggerInfo.onBuild.future.toLowerCase()}`;
			const wrapped = main.length ? [{ title, items: main }] : [];
			return [...wrapped, ...hoisted];
		},
		describe(
			target: T,
			ctx: TranslationContext,
			opts?: { installed?: boolean },
		): Summary {
			const inner = translator.describe(target, ctx, opts);
			if (!inner.length) {
				return [];
			}
			const main: Summary = [];
			const hoisted: Summary = [];
			for (const entry of inner) {
				if (typeof entry === 'object' && entry && '_hoist' in entry) {
					const { _hoist, ...rest } = entry as Record<string, unknown>;
					hoisted.push(rest as unknown as Summary[number]);
				} else {
					main.push(entry);
				}
			}
			const title = opts?.installed
				? `${triggerInfo.onBuild.icon} ${triggerInfo.onBuild.future}`
				: `${triggerInfo.onBuild.icon} On build, ${triggerInfo.onBuild.future.toLowerCase()}`;
			const wrapped = main.length ? [{ title, items: main }] : [];
			return [...wrapped, ...hoisted];
		},
		log(
			target: T,
			ctx: TranslationContext,
			opts?: { installed?: boolean },
		): TranslatorLogEntry[] {
			return translator.log ? translator.log(target, ctx, opts) : [];
		},
	};
}
