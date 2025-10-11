import type { ContentTranslator, Summary, TranslatorLogEntry } from './types';
import type { TranslationContext } from '../context';

const DEFAULT_TRIGGERS: Record<string, { icon?: string; future?: string }> = {
	onBuild: { icon: '⚒️', future: 'Until removed' },
};

function selectTriggerFuture(
	context: TranslationContext,
	key: string,
): { icon?: string; future: string } {
	const trigger = context.assets.triggers[key];
	const fallback = DEFAULT_TRIGGERS[key] ?? { future: key };
	const icon = trigger?.icon ?? fallback.icon;
	const future = trigger?.future ?? fallback.future ?? key;
	return { icon, future };
}

function formatInstallationTitle(
	context: TranslationContext,
	installed: boolean,
): string {
	const info = selectTriggerFuture(context, 'onBuild');
	const icon = (info.icon ?? '').trim();
	const future = info.future.trim();
	const iconPrefix = icon.length > 0 ? `${icon} ` : '';
	if (installed) {
		return `${iconPrefix}${future}`.trim();
	}
	const lowered = future.length > 0 ? future.toLowerCase() : '';
	const suffix = lowered.length > 0 ? `On build, ${lowered}` : 'On build';
	return `${iconPrefix}${suffix}`.trim();
}

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
			const title = formatInstallationTitle(
				context,
				options?.installed ?? false,
			);
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
			const title = formatInstallationTitle(
				context,
				options?.installed ?? false,
			);
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
