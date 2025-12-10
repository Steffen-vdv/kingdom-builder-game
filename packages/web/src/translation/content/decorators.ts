import type { ContentTranslator, Summary, TranslatorLogEntry } from './types';
import type { TranslationContext } from '../context';
import { selectTriggerDisplay } from '../context/assetSelectors';

export function withInstallation<T>(
	translator: ContentTranslator<T, unknown>,
): ContentTranslator<T, { installed?: boolean }> {
	return {
		summarize(
			target: T,
			context: TranslationContext,
			options?: { installed?: boolean },
		): Summary {
			const inner = translator.summarize(target, context, options);
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
			const trigger = selectTriggerDisplay(context.assets, 'onBuild');
			const icon = trigger.icon ? `${trigger.icon} ` : '';
			const futureLabel = trigger.future ?? 'Until removed';
			const installedTitle = `${icon}${futureLabel}`.trim();
			const uninstalledTitle =
				`${icon}On build, ${futureLabel.toLowerCase()}`.trim();
			const title = options?.installed ? installedTitle : uninstalledTitle;
			const wrapped = main.length ? [{ title, items: main }] : [];
			return [...wrapped, ...hoisted];
		},
		describe(
			target: T,
			context: TranslationContext,
			options?: { installed?: boolean },
		): Summary {
			const inner = translator.describe(target, context, options);
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
			const trigger = selectTriggerDisplay(context.assets, 'onBuild');
			const icon = trigger.icon ? `${trigger.icon} ` : '';
			const futureLabel = trigger.future ?? 'Until removed';
			const installedTitle = `${icon}${futureLabel}`.trim();
			const uninstalledTitle =
				`${icon}On build, ${futureLabel.toLowerCase()}`.trim();
			const title = options?.installed ? installedTitle : uninstalledTitle;
			const wrapped = main.length ? [{ title, items: main }] : [];
			return [...wrapped, ...hoisted];
		},
		log(
			target: T,
			context: TranslationContext,
			options?: { installed?: boolean },
		): TranslatorLogEntry[] {
			return translator.log ? translator.log(target, context, options) : [];
		},
	};
}
