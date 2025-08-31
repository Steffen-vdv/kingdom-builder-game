import type { EngineContext } from '@kingdom-builder/engine';
import { logContent } from './factory';

export type ActionLogHook = (
  ctx: EngineContext,
  params?: Record<string, unknown>,
) => string;

const hooks = new Map<string, ActionLogHook>();

export function registerActionLogHook(id: string, hook: ActionLogHook) {
  hooks.set(id, hook);
}

export function getActionLogHook(id: string) {
  return hooks.get(id);
}

registerActionLogHook('develop', (ctx, params) => {
  const id =
    typeof (params as { id?: string })?.id === 'string'
      ? (params as { id: string }).id
      : undefined;
  if (!id) return '';
  const target = logContent('development', id, ctx)[0];
  return target ? ` - ${target}` : '';
});

registerActionLogHook('build', (ctx, params) => {
  const id =
    typeof (params as { id?: string })?.id === 'string'
      ? (params as { id: string }).id
      : undefined;
  if (!id) return '';
  const target = logContent('building', id, ctx)[0];
  return target ? ` - ${target}` : '';
});
