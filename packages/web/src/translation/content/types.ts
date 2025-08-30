import type { EngineContext } from '@kingdom-builder/engine';

export interface Land {
  id: string;
  slotsMax: number;
  slotsUsed: number;
  slotsFree: number;
  developments: string[];
}

export type SummaryEntry = string | { title: string; items: SummaryEntry[] };
export type Summary = SummaryEntry[];

export interface ContentTranslator<T = unknown, O = Record<string, unknown>> {
  summarize(target: T, ctx: EngineContext, opts?: O): Summary;
  describe(target: T, ctx: EngineContext, opts?: O): Summary;
  log?(target: T, ctx: EngineContext, opts?: O): string[];
}
