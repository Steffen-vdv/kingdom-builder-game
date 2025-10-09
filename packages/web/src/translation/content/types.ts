import type { LegacyEngineContext, TranslationContext } from '../context';
import type { ActionLogLineDescriptor } from '../log/timeline';

export interface Land {
	id: string;
	slotsMax: number;
	slotsUsed: number;
	slotsFree: number;
	developments: string[];
}

export interface SummaryGroup {
	title: string;
	items: SummaryEntry[];
	_desc?: true;
	_hoist?: true;
	className?: string;
	[key: string]: unknown;
}

export type SummaryEntry = string | SummaryGroup;
export type Summary = SummaryEntry[];

type BivariantCallback<Args extends unknown[], TResult> = {
	bivarianceHack(...args: Args): TResult;
}['bivarianceHack'];

export type ContentTranslatorContext = TranslationContext;

/**
 * @deprecated Prefer {@link ContentTranslatorContext}. This alias is retained
 * so translators that still reference the full engine context continue to
 * type-check during the transition.
 */
export type LegacyContentTranslatorContext = LegacyEngineContext;

export type TranslatorLogEntry = string | ActionLogLineDescriptor;

export interface ContentTranslator<T = unknown, O = Record<string, unknown>> {
	summarize: BivariantCallback<[T, TranslationContext, O?], Summary>;
	describe: BivariantCallback<[T, TranslationContext, O?], Summary>;
	log?: BivariantCallback<[T, TranslationContext, O?], TranslatorLogEntry[]>;
}

/**
 * @deprecated Temporary compatibility surface for translators that still type
 * their implementations against {@link LegacyContentTranslatorContext}. The
 * runtime translation context conforms to {@link ContentTranslatorContext}; new
 * code should migrate to that interface.
 */
export interface LegacyContentTranslator<
	T = unknown,
	O = Record<string, unknown>,
> {
	summarize: BivariantCallback<[T, LegacyEngineContext, O?], Summary>;
	describe: BivariantCallback<[T, LegacyEngineContext, O?], Summary>;
	log?: BivariantCallback<[T, LegacyEngineContext, O?], TranslatorLogEntry[]>;
}
