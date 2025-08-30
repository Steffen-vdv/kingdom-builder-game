import type { ContentTranslator, Summary } from './types';
import { TRIGGER_INFO as triggerInfo } from '@kingdom-builder/engine';
import type { EngineContext } from '@kingdom-builder/engine';

export function withInstallation<T>(
  translator: ContentTranslator<T, unknown>,
): ContentTranslator<T, { installed?: boolean }> {
  return {
    summarize(
      target: T,
      ctx: EngineContext,
      opts?: { installed?: boolean },
    ): Summary {
      const inner = translator.summarize(target, ctx, opts);
      if (!inner.length) return [];
      const title = opts?.installed
        ? `${triggerInfo.onBuild.icon} ${triggerInfo.onBuild.future}`
        : `${triggerInfo.onBuild.icon} On build, ${triggerInfo.onBuild.future.toLowerCase()}`;
      return [{ title, items: inner }];
    },
    describe(
      target: T,
      ctx: EngineContext,
      opts?: { installed?: boolean },
    ): Summary {
      const inner = translator.describe(target, ctx, opts);
      if (!inner.length) return [];
      const title = opts?.installed
        ? `${triggerInfo.onBuild.icon} ${triggerInfo.onBuild.future}`
        : `${triggerInfo.onBuild.icon} On build, ${triggerInfo.onBuild.future.toLowerCase()}`;
      return [{ title, items: inner }];
    },
    log(
      target: T,
      ctx: EngineContext,
      opts?: { installed?: boolean },
    ): string[] {
      return translator.log ? translator.log(target, ctx, opts) : [];
    },
  };
}
