import type { TranslationContext } from '../context';
import type {
	ContentTranslator,
	LegacyContentTranslator,
	LegacyContentTranslatorContext,
	Summary,
	TranslatorLogEntry,
} from './types';

const TRANSLATORS = new Map<string, ContentTranslator<unknown, unknown>>();

export function registerContentTranslator<T, O>(
	type: string,
	translator: ContentTranslator<T, O> | LegacyContentTranslator<T, O>,
): void {
	TRANSLATORS.set(type, translator as ContentTranslator<unknown, unknown>);
}

export function summarizeContent<T, O>(
	type: string,
	target: T,
	ctx: TranslationContext,
	opts?: O,
): Summary;
export function summarizeContent<T, O>(
	type: string,
	target: T,
	ctx: LegacyContentTranslatorContext,
	opts?: O,
): Summary;
export function summarizeContent<T, O>(
	type: string,
	target: T,
	ctx: TranslationContext | LegacyContentTranslatorContext,
	opts?: O,
): Summary {
	const translator = TRANSLATORS.get(type) as
		| ContentTranslator<T, O>
		| undefined;
	return translator
		? translator.summarize(target, ctx as TranslationContext, opts)
		: [];
}

export function describeContent<T, O>(
	type: string,
	target: T,
	ctx: TranslationContext,
	opts?: O,
): Summary;
export function describeContent<T, O>(
	type: string,
	target: T,
	ctx: LegacyContentTranslatorContext,
	opts?: O,
): Summary;
export function describeContent<T, O>(
	type: string,
	target: T,
	ctx: TranslationContext | LegacyContentTranslatorContext,
	opts?: O,
): Summary {
	const translator = TRANSLATORS.get(type) as
		| ContentTranslator<T, O>
		| undefined;
	return translator
		? translator.describe(target, ctx as TranslationContext, opts)
		: [];
}

export function logContent<T, O>(
	type: string,
	target: T,
	ctx: TranslationContext,
	opts?: O,
): TranslatorLogEntry[];
export function logContent<T, O>(
	type: string,
	target: T,
	ctx: LegacyContentTranslatorContext,
	opts?: O,
): TranslatorLogEntry[];
export function logContent<T, O>(
	type: string,
	target: T,
	ctx: TranslationContext | LegacyContentTranslatorContext,
	opts?: O,
): TranslatorLogEntry[] {
	const translator = TRANSLATORS.get(type) as
		| ContentTranslator<T, O>
		| undefined;
	return translator?.log
		? translator.log(target, ctx as TranslationContext, opts)
		: [];
}
