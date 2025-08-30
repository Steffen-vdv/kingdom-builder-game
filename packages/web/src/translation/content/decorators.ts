import type { ContentTranslator, Summary } from './types';
import { phaseInfo } from '../../icons';
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
        ? `${phaseInfo.onBuild.icon} ${phaseInfo.onBuild.future}`
        : `${phaseInfo.onBuild.icon} On build, ${phaseInfo.onBuild.future.toLowerCase()}`;
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
        ? `${phaseInfo.onBuild.icon} ${phaseInfo.onBuild.future}`
        : `${phaseInfo.onBuild.icon} On build, ${phaseInfo.onBuild.future.toLowerCase()}`;
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
