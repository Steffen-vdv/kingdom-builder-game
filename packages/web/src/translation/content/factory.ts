import type { TranslationContext } from '../context';
import type { ContentTranslator, Summary, TranslatorLogEntry } from './types';

const TRANSLATORS = new Map<string, ContentTranslator<unknown, unknown>>();

export function registerContentTranslator<T, O>(
	type: string,
	translator: ContentTranslator<T, O>,
): void {
	TRANSLATORS.set(type, translator as ContentTranslator<unknown, unknown>);
}

export function summarizeContent<T, O>(
	type: string,
	target: T,
	context: TranslationContext,
	options?: O,
): Summary;
export function summarizeContent<T, O>(
	type: string,
	target: T,
	context: TranslationContext,
	options?: O,
): Summary {
	const translator = TRANSLATORS.get(type) as
		| ContentTranslator<T, O>
		| undefined;
	return translator ? translator.summarize(target, context, options) : [];
}

export function describeContent<T, O>(
	type: string,
	target: T,
	context: TranslationContext,
	options?: O,
): Summary;
export function describeContent<T, O>(
	type: string,
	target: T,
	context: TranslationContext,
	options?: O,
): Summary {
	const translator = TRANSLATORS.get(type) as
		| ContentTranslator<T, O>
		| undefined;
	return translator ? translator.describe(target, context, options) : [];
}

export function logContent<T, O>(
	type: string,
	target: T,
	context: TranslationContext,
	options?: O,
): TranslatorLogEntry[];
export function logContent<T, O>(
	type: string,
	target: T,
	context: TranslationContext,
	options?: O,
): TranslatorLogEntry[] {
	const translator = TRANSLATORS.get(type) as
		| ContentTranslator<T, O>
		| undefined;
	return translator?.log ? translator.log(target, context, options) : [];
}
