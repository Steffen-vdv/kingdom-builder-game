import type { TranslationContext } from '../context';
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

export type TranslatorLogEntry = string | ActionLogLineDescriptor;

export interface ContentTranslator<T = unknown, O = Record<string, unknown>> {
	summarize: BivariantCallback<[T, TranslationContext, O?], Summary>;
	describe: BivariantCallback<[T, TranslationContext, O?], Summary>;
	log?: BivariantCallback<[T, TranslationContext, O?], TranslatorLogEntry[]>;
}
