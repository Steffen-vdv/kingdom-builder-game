import type { EngineContext } from '@kingdom-builder/engine';

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

export interface ContentTranslator<T = unknown, O = Record<string, unknown>> {
	summarize(target: T, ctx: EngineContext, opts?: O): Summary;
	describe(target: T, ctx: EngineContext, opts?: O): Summary;
	log?(target: T, ctx: EngineContext, opts?: O): string[];
}
