import type { EffectDef } from './effects';
import type { EngineContext } from './context';
import type { EvaluatorDef } from './evaluators';
import type {
  PlayerState,
  StatKey,
  StatSourceLink,
  StatSourceMeta,
} from './state';

const EPSILON = 1e-9;

export interface StatSourceMetaPartial {
  key?: string;
  longevity?: 'ongoing' | 'permanent';
  kind?: string;
  id?: string;
  detail?: string;
  instance?: string;
  dependsOn?: StatSourceLink[];
  removal?: StatSourceLink;
  effect?: { type?: string; method?: string };
  extra?: Record<string, unknown>;
}

export type StatSourceFrame = (
  effect: EffectDef,
  ctx: EngineContext,
  statKey: StatKey,
) => StatSourceMetaPartial | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function cloneLink(
  link: StatSourceLink | undefined,
): StatSourceLink | undefined {
  if (!link) return undefined;
  const cloned: StatSourceLink = {};
  if (link.type) cloned.type = link.type;
  if (link.id) cloned.id = link.id;
  if (link.detail) cloned.detail = link.detail;
  if (link.extra) cloned.extra = { ...link.extra };
  return cloned;
}

function linkEquals(a: StatSourceLink, b: StatSourceLink): boolean {
  return a.type === b.type && a.id === b.id && a.detail === b.detail;
}

function mergeLinkCollections(
  base: StatSourceLink[] | undefined,
  incoming: StatSourceLink[] | undefined,
): StatSourceLink[] | undefined {
  if (!incoming || !incoming.length) return base;
  const result = base ? base.map((link) => cloneLink(link)!) : [];
  for (const link of incoming) {
    const normalized = cloneLink(link);
    if (!normalized) continue;
    if (!result.some((existing) => linkEquals(existing, normalized)))
      result.push(normalized);
  }
  return result.length ? result : undefined;
}

function appendDependency(meta: StatSourceMeta, link: StatSourceLink) {
  const normalized = cloneLink(link);
  if (!normalized) return;
  const existing = meta.dependsOn || [];
  if (!existing.some((dep) => linkEquals(dep, normalized)))
    meta.dependsOn = [...existing, normalized];
}

function mergeExtra(
  base: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!incoming || !Object.keys(incoming).length)
    return base ? { ...base } : undefined;
  return { ...(base || {}), ...incoming };
}

function mergeMeta(
  base: StatSourceMeta,
  incoming?: StatSourceMetaPartial | StatSourceMeta,
) {
  if (!incoming) return;
  const partial = incoming as StatSourceMetaPartial;
  if (partial.key) base.key = partial.key;
  if (partial.longevity) {
    if (base.longevity !== 'ongoing' || partial.longevity === 'ongoing')
      base.longevity = partial.longevity;
  }
  if (!base.kind && partial.kind) base.kind = partial.kind;
  if (!base.id && partial.id) base.id = partial.id;
  if (!base.detail && partial.detail) base.detail = partial.detail;
  if (!base.instance && partial.instance) base.instance = partial.instance;
  if (partial.dependsOn) {
    const merged = mergeLinkCollections(base.dependsOn, partial.dependsOn);
    if (merged) base.dependsOn = merged;
  }
  if (partial.removal && !base.removal) {
    const removalClone = cloneLink(partial.removal);
    if (removalClone) base.removal = removalClone;
  }
  if (partial.effect) {
    const effectInfo: NonNullable<StatSourceMeta['effect']> = {
      ...(base.effect || {}),
    };
    if (partial.effect.type) effectInfo.type = partial.effect.type;
    if (partial.effect.method) effectInfo.method = partial.effect.method;
    if (Object.keys(effectInfo).length) base.effect = effectInfo;
  }
  if (partial.extra) {
    const mergedExtra = mergeExtra(base.extra, partial.extra);
    if (mergedExtra) base.extra = mergedExtra;
  }
}

function normalizeLink(value: unknown): StatSourceLink | undefined {
  if (!isRecord(value)) return undefined;
  const link: StatSourceLink = {};
  if (typeof value.type === 'string' && value.type.trim())
    link.type = value.type.trim();
  if (typeof value.id === 'string' && value.id.trim())
    link.id = value.id.trim();
  if (typeof value.detail === 'string' && value.detail.trim())
    link.detail = value.detail.trim();
  const extraEntries = Object.entries(value).filter(
    ([key]) => !['type', 'id', 'detail'].includes(key),
  );
  if (extraEntries.length) link.extra = Object.fromEntries(extraEntries);
  return Object.keys(link).length ? link : undefined;
}

function normalizeLinks(value: unknown): StatSourceLink[] | undefined {
  if (!value) return undefined;
  const list = Array.isArray(value) ? value : [value];
  const normalized = list
    .map((entry) => normalizeLink(entry))
    .filter((entry): entry is StatSourceLink => Boolean(entry));
  return normalized.length ? normalized : undefined;
}

function extractMetaFromEffect(
  effect: EffectDef,
  statKey: StatKey,
): StatSourceMetaPartial | undefined {
  const rawValue = effect.meta?.['statSource'];
  const raw = isRecord(rawValue) ? rawValue : undefined;
  if (!raw) return undefined;
  const partial: StatSourceMetaPartial = {};
  if (typeof raw['key'] === 'string' && raw['key'].trim())
    partial.key = raw['key'].trim();
  if (raw['longevity'] === 'ongoing' || raw['longevity'] === 'permanent')
    partial.longevity = raw['longevity'];
  if (typeof raw['kind'] === 'string' && raw['kind'].trim())
    partial.kind = raw['kind'].trim();
  if (typeof raw['id'] === 'string' && raw['id'].trim())
    partial.id = raw['id'].trim();
  if (typeof raw['detail'] === 'string' && raw['detail'].trim())
    partial.detail = raw['detail'].trim();
  if (raw['instance'] !== undefined) partial.instance = String(raw['instance']);
  const dependsOn = normalizeLinks(raw['dependsOn']);
  if (dependsOn) partial.dependsOn = dependsOn;
  const removal = normalizeLink(raw['removal']);
  if (removal) partial.removal = removal;
  const extraEntries = Object.entries(raw).filter(
    ([key]) =>
      ![
        'key',
        'longevity',
        'kind',
        'id',
        'detail',
        'instance',
        'dependsOn',
        'removal',
      ].includes(key),
  );
  if (extraEntries.length) partial.extra = Object.fromEntries(extraEntries);
  const effectInfo: StatSourceMetaPartial['effect'] = {};
  if (effect.type) effectInfo.type = effect.type;
  if (effect.method) effectInfo.method = effect.method;
  if (Object.keys(effectInfo).length) partial.effect = effectInfo;
  if (!partial.key)
    partial.key = `${effect.type ?? 'stat'}:${effect.method ?? 'change'}:${statKey}`;
  if (!partial.longevity) partial.longevity = 'permanent';
  return partial;
}

function cloneMeta(meta: StatSourceMeta): StatSourceMeta {
  const cloned: StatSourceMeta = {
    key: meta.key,
    longevity: meta.longevity,
  };
  if (meta.kind) cloned.kind = meta.kind;
  if (meta.id) cloned.id = meta.id;
  if (meta.detail) cloned.detail = meta.detail;
  if (meta.instance) cloned.instance = meta.instance;
  if (meta.dependsOn)
    cloned.dependsOn = meta.dependsOn
      .map((dep) => cloneLink(dep))
      .filter((dep): dep is StatSourceLink => Boolean(dep));
  if (meta.removal) {
    const removalClone = cloneLink(meta.removal);
    if (removalClone) cloned.removal = removalClone;
  }
  if (meta.effect) cloned.effect = { ...meta.effect };
  if (meta.extra) cloned.extra = { ...meta.extra };
  return cloned;
}

export function withStatSourceFrames<T>(
  ctx: EngineContext,
  frames: StatSourceFrame | StatSourceFrame[] | undefined,
  fn: () => T,
): T {
  const list = Array.isArray(frames) ? frames : frames ? [frames] : [];
  for (const frame of list) ctx.statSourceStack.push(frame);
  try {
    return fn();
  } finally {
    for (let index = 0; index < list.length; index += 1)
      ctx.statSourceStack.pop();
  }
}

export function resolveStatSourceMeta(
  effect: EffectDef,
  ctx: EngineContext,
  statKey: StatKey,
): StatSourceMeta {
  const meta: StatSourceMeta = {
    key: `${effect.type ?? 'stat'}:${effect.method ?? 'change'}:${statKey}`,
    longevity: 'permanent',
  };
  const effectInfo: StatSourceMetaPartial['effect'] = {};
  if (effect.type) effectInfo.type = effect.type;
  if (effect.method) effectInfo.method = effect.method;
  if (Object.keys(effectInfo).length) meta.effect = effectInfo;
  for (const frame of ctx.statSourceStack) {
    const partial = frame(effect, ctx, statKey);
    if (partial) mergeMeta(meta, partial);
  }
  const effectMeta = extractMetaFromEffect(effect, statKey);
  if (effectMeta) mergeMeta(meta, effectMeta);
  return meta;
}

export function applyStatDelta(
  player: PlayerState,
  statKey: StatKey,
  delta: number,
  meta: StatSourceMeta,
) {
  if (Math.abs(delta) < EPSILON) return;
  const sources =
    player.statSources[statKey] || (player.statSources[statKey] = {});
  const existing = sources[meta.key];
  const normalizedDelta = Math.abs(delta) < EPSILON ? 0 : delta;
  if (!existing) {
    if (normalizedDelta === 0) return;
    sources[meta.key] = {
      amount: normalizedDelta,
      meta: cloneMeta(meta),
    };
    return;
  }
  const nextAmount = existing.amount + normalizedDelta;
  if (Math.abs(nextAmount) < EPSILON) {
    delete sources[meta.key];
    return;
  }
  existing.amount = nextAmount;
  mergeMeta(existing.meta, meta);
}

export function recordEffectStatDelta(
  effect: EffectDef,
  ctx: EngineContext,
  statKey: StatKey,
  delta: number,
) {
  if (Math.abs(delta) < EPSILON) return;
  const meta = resolveStatSourceMeta(effect, ctx, statKey);
  if (effect.type === 'stat' && effect.method === 'add_pct') {
    const params = isRecord(effect.params) ? effect.params : undefined;
    const pctStat = params?.['percentStat'];
    if (typeof pctStat === 'string' && pctStat.trim())
      appendDependency(meta, { type: 'stat', id: pctStat.trim() });
  }
  applyStatDelta(ctx.activePlayer, statKey, delta, meta);
}

function collectFromEvaluator(
  def: EvaluatorDef | number | undefined,
): StatSourceLink[] {
  if (!def || typeof def === 'number') return [];
  if (def.type === 'population') {
    const role = isRecord(def.params) ? def.params['role'] : undefined;
    if (typeof role === 'string' && role.trim())
      return [{ type: 'population', id: role.trim() }];
  }
  if (def.type === 'development') {
    const id = isRecord(def.params) ? def.params['id'] : undefined;
    if (typeof id === 'string' && id.trim())
      return [{ type: 'development', id: id.trim() }];
  }
  if (def.type === 'stat') {
    const key = isRecord(def.params) ? def.params['key'] : undefined;
    if (typeof key === 'string' && key.trim())
      return [{ type: 'stat', id: key.trim() }];
  }
  if (def.type === 'compare') {
    const params = isRecord(def.params) ? def.params : undefined;
    if (!params) return [];
    const left = collectFromEvaluator(params['left'] as EvaluatorDef | number);
    const right = collectFromEvaluator(
      params['right'] as EvaluatorDef | number,
    );
    return [...left, ...right];
  }
  return [];
}

export function collectEvaluatorDependencies(
  evaluator: EvaluatorDef | undefined,
): StatSourceLink[] {
  if (!evaluator) return [];
  return collectFromEvaluator(evaluator);
}
