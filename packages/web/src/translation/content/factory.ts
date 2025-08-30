import type { EngineContext } from '@kingdom-builder/engine';
import type { ContentTranslator, Summary } from './types';

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
  ctx: EngineContext,
  opts?: O,
): Summary {
  const translator = TRANSLATORS.get(type) as
    | ContentTranslator<T, O>
    | undefined;
  return translator ? translator.summarize(target, ctx, opts) : [];
}

export function describeContent<T, O>(
  type: string,
  target: T,
  ctx: EngineContext,
  opts?: O,
): Summary {
  const translator = TRANSLATORS.get(type) as
    | ContentTranslator<T, O>
    | undefined;
  return translator ? translator.describe(target, ctx, opts) : [];
}
