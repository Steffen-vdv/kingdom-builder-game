import type { ContentTranslator, Summary, TranslatorLogEntry } from './types';
import type { TranslationContext } from '../context';
import { selectTriggerDisplay } from '../context/assetSelectors';

/**
 * Installation display options for buildings and developments.
 *
 * @property installed - Whether the building/development is currently owned.
 *   Affects title: installed shows "⚒️ Until removed", uninstalled shows
 *   "⚒️ On build, until removed".
 * @property omitTriggerTitle - When true, skips wrapping effects in the
 *   trigger title entirely. Use this when viewing owned assets where the
 *   installation context is implied (e.g., in the player panel buildings list).
 */
export interface InstallationOptions {
	installed?: boolean;
	omitTriggerTitle?: boolean;
}

export function withInstallation<T>(
	translator: ContentTranslator<T, unknown>,
): ContentTranslator<T, InstallationOptions> {
	return {
		summarize(
			target: T,
			context: TranslationContext,
			options?: InstallationOptions,
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
			// When omitTriggerTitle is true, return raw items without wrapper
			if (options?.omitTriggerTitle) {
				return [...main, ...hoisted];
			}
			const trigger = selectTriggerDisplay(context.assets, 'onBuild');
			const icon = trigger.icon ? `${trigger.icon} ` : '';
			const conditionSuffix = trigger.condition
				? `, ${trigger.condition.toLowerCase()}`
				: '';
			const installedTitle = trigger.condition
				? `${icon}${trigger.condition}`.trim()
				: `${icon}${trigger.text}`.trim();
			const uninstalledTitle =
				`${icon}${trigger.text}${conditionSuffix}`.trim();
			const title = options?.installed ? installedTitle : uninstalledTitle;
			const wrapped = main.length ? [{ title, items: main }] : [];
			return [...wrapped, ...hoisted];
		},
		describe(
			target: T,
			context: TranslationContext,
			options?: InstallationOptions,
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
			// When omitTriggerTitle is true, return raw items without wrapper
			if (options?.omitTriggerTitle) {
				return [...main, ...hoisted];
			}
			const trigger = selectTriggerDisplay(context.assets, 'onBuild');
			const icon = trigger.icon ? `${trigger.icon} ` : '';
			const conditionSuffix = trigger.condition
				? `, ${trigger.condition.toLowerCase()}`
				: '';
			const installedTitle = trigger.condition
				? `${icon}${trigger.condition}`.trim()
				: `${icon}${trigger.text}`.trim();
			const uninstalledTitle =
				`${icon}${trigger.text}${conditionSuffix}`.trim();
			const title = options?.installed ? installedTitle : uninstalledTitle;
			const wrapped = main.length ? [{ title, items: main }] : [];
			return [...wrapped, ...hoisted];
		},
		log(
			target: T,
			context: TranslationContext,
			options?: InstallationOptions,
		): TranslatorLogEntry[] {
			return translator.log ? translator.log(target, context, options) : [];
		},
	};
}
