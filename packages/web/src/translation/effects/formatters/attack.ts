import {
  BUILDINGS,
  RESOURCES,
  STATS,
  Resource,
  Stat,
  type ResourceKey,
  type StatKey,
} from '@kingdom-builder/contents';
import type {
  AttackLog,
  AttackOnDamageLogEntry,
  AttackPlayerDiff,
  EngineContext,
  EffectDef,
} from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../content';
import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
} from '../factory';
import { formatStatValue } from '../../../utils/stats';
import { createAttackTargetFormatter } from './attack/target-formatter';

type Mode = 'summarize' | 'describe';

type DamageEffectFormatter = (item: SummaryEntry, mode: Mode) => SummaryEntry[];

const DAMAGE_EFFECT_CATEGORIES: Record<string, DamageEffectFormatter> = {
  'action:perform': (item, mode) => [
    mode === 'summarize' && typeof item !== 'string'
      ? (item as { title: string }).title
      : item,
  ],
};

function categorizeDamageEffects(
  def: EffectDef,
  item: SummaryEntry,
  mode: Mode,
): { actions: SummaryEntry[]; others: SummaryEntry[] } {
  const key = `${def.type}:${def.method}`;
  const handler = DAMAGE_EFFECT_CATEGORIES[key];
  if (handler) return { actions: handler(item, mode), others: [] };
  return { actions: [], others: [item] };
}

function ownerLabel(owner: 'attacker' | 'defender') {
  return owner === 'attacker' ? 'You' : 'Opponent';
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toString();
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number): string {
  return `${formatNumber(value * 100)}%`;
}

function formatSigned(value: number): string {
  const formatted = formatNumber(Math.abs(value));
  return `${value >= 0 ? '+' : '-'}${formatted}`;
}

function formatStatSigned(key: string, value: number): string {
  const formatted = formatStatValue(key, Math.abs(value));
  return `${value >= 0 ? '+' : '-'}${formatted}`;
}

function getBuildingDisplay(id: string): { icon: string; label: string } {
  try {
    const def = BUILDINGS.get(id);
    return { icon: def.icon ?? '', label: def.name ?? id };
  } catch {
    return { icon: '', label: id };
  }
}

function getTargetInfo(eff: EffectDef<Record<string, unknown>>): {
  target:
    | { type: 'resource'; key: ResourceKey }
    | { type: 'stat'; key: StatKey }
    | { type: 'building'; id: string };
  info: { icon: string; label: string };
} {
  const targetParam = eff.params?.['target'] as
    | { type: 'resource'; key: ResourceKey }
    | { type: 'stat'; key: StatKey }
    | { type: 'building'; id: string }
    | undefined;
  if (targetParam?.type === 'stat')
    return { target: targetParam, info: STATS[targetParam.key] };
  if (targetParam?.type === 'building')
    return { target: targetParam, info: getBuildingDisplay(targetParam.id) };
  const key: ResourceKey =
    targetParam && targetParam.type === 'resource'
      ? targetParam.key
      : Resource.castleHP;
  return { target: { type: 'resource', key }, info: RESOURCES[key] };
}

function baseEntry(
  eff: EffectDef<Record<string, unknown>>,
  mode: Mode,
): { entry: SummaryEntry; target: { icon: string; label: string } } {
  const army = STATS[Stat.armyStrength];
  const absorption = STATS[Stat.absorption];
  const fort = STATS[Stat.fortificationStrength];
  const { target, info } = getTargetInfo(eff);
  const targetLabel = iconLabel(info.icon, info.label);
  const targetFormatter = createAttackTargetFormatter(target);

  if (mode === 'summarize') {
    return {
      entry: targetFormatter.summarizeBaseEntry({
        army,
        fort,
        info,
        targetLabel,
      }),
      target: info,
    };
  }

  const ignoreAbsorption = Boolean(eff.params?.['ignoreAbsorption']);
  const ignoreFortification = Boolean(eff.params?.['ignoreFortification']);
  return {
    entry: {
      title: `Attack opponent with your ${army.icon} ${army.label}`,
      items: [
        ignoreAbsorption
          ? `Ignoring ${absorption.icon} ${absorption.label} damage reduction`
          : `${absorption.icon} ${absorption.label} damage reduction applied`,
        ...(ignoreFortification
          ? [`Damage applied directly to opponent's ${targetLabel}`]
          : targetFormatter.describeFortificationItems({
              fort,
              info,
              targetLabel,
            })),
      ],
    },
    target: info,
  };
}

function summarizeOnDamage(
  eff: EffectDef<Record<string, unknown>>,
  ctx: EngineContext,
  mode: Mode,
): SummaryEntry | null {
  const onDamage = eff.params?.['onDamage'] as
    | { attacker?: EffectDef[]; defender?: EffectDef[] }
    | undefined;
  if (!onDamage) return null;
  const { target, info } = getTargetInfo(eff);
  const targetFormatter = createAttackTargetFormatter(target);
  const format = mode === 'summarize' ? summarizeEffects : describeEffects;
  const attackerDefs = onDamage.attacker ?? [];
  const defenderDefs = onDamage.defender ?? [];
  const attackerEntries = format(attackerDefs, ctx);
  const defenderEntries = format(defenderDefs, ctx);
  const items: SummaryEntry[] = [];
  const actionItems: SummaryEntry[] = [];

  const collect = (
    defs: EffectDef[],
    entries: SummaryEntry[],
    suffix: string,
  ) => {
    entries.forEach((entry, index) => {
      const def = defs[index]!;
      const { actions, others } = categorizeDamageEffects(def, entry, mode);
      actionItems.push(...actions);
      others.forEach((other) => {
        if (typeof other === 'string') items.push(`${other} ${suffix}`);
        else items.push({ ...other, title: `${other.title} ${suffix}` });
      });
    });
  };

  collect(defenderDefs, defenderEntries, 'for opponent');
  collect(attackerDefs, attackerEntries, 'for you');

  const combined = items.concat(actionItems);
  if (!combined.length) return null;
  const summaryTarget =
    target.type === 'building' ? info.icon || info.label : info.icon;
  const describeTarget =
    target.type === 'building'
      ? iconLabel(info.icon, info.label)
      : `${info.icon} ${info.label}`;
  return {
    title: targetFormatter.onDamageTitle(mode, {
      info,
      summaryTarget,
      describeTarget,
    }),
    items: combined,
  };
}

function fallbackLog(
  eff: EffectDef<Record<string, unknown>>,
  ctx: EngineContext,
): SummaryEntry[] {
  const { entry } = baseEntry(eff, 'describe');
  const onDamage = summarizeOnDamage(eff, ctx, 'describe');
  const parts: SummaryEntry[] = [entry];
  if (onDamage) parts.push(onDamage);
  return parts;
}

function buildEvaluationEntry(log: AttackLog['evaluation']): SummaryEntry {
  const army = STATS[Stat.armyStrength];
  const absorption = STATS[Stat.absorption];
  const fort = STATS[Stat.fortificationStrength];
  const targetInfo =
    log.target.type === 'building'
      ? getBuildingDisplay(log.target.id)
      : log.target.type === 'stat'
        ? STATS[log.target.key as StatKey]
        : RESOURCES[log.target.key as ResourceKey];
  const targetLabel = iconLabel(targetInfo.icon, targetInfo.label);
  const formatter = createAttackTargetFormatter(
    log.target.type === 'building'
      ? { type: 'building', id: log.target.id }
      : log.target.type === 'stat'
        ? { type: 'stat', key: log.target.key as StatKey }
        : { type: 'resource', key: log.target.key as ResourceKey },
  );
  return formatter.buildEvaluationEntry(log, {
    army,
    absorption,
    fort,
    info: targetInfo,
    targetLabel,
    formatNumber,
    formatPercent,
  });
}

interface DiffFormatOptions {
  percent?: number;
  showPercent?: boolean;
}

function iconLabel(icon: string | undefined, label: string): string {
  return icon ? `${icon} ${label}` : label;
}

function formatResourceDiff(
  prefix: string,
  diff: AttackPlayerDiff,
  options?: DiffFormatOptions,
): string {
  const info = RESOURCES[diff.key as ResourceKey];
  const icon = info?.icon || '';
  const label = info?.label || diff.key;
  const displayLabel = iconLabel(icon, label);
  const delta = diff.after - diff.before;
  const before = formatNumber(diff.before);
  const after = formatNumber(diff.after);
  if (options?.percent !== undefined) {
    const magnitude = Math.abs(options.percent);
    return `${prefix}: ${displayLabel} ${
      delta >= 0 ? '+' : '-'
    }${formatNumber(magnitude)}% (${before}→${after}) (${formatSigned(delta)})`;
  }
  if (options?.showPercent && diff.before !== 0 && delta !== 0) {
    const pct = (delta / diff.before) * 100;
    return `${prefix}: ${displayLabel} ${formatSigned(pct)}% (${before}→${after}) (${formatSigned(delta)})`;
  }
  return `${prefix}: ${displayLabel} ${formatSigned(delta)} (${before}→${after})`;
}

function formatStatDiff(prefix: string, diff: AttackPlayerDiff): string {
  const info = STATS[diff.key as StatKey];
  const icon = info?.icon || '';
  const label = info?.label || diff.key;
  const displayLabel = iconLabel(icon, label);
  const delta = diff.after - diff.before;
  const before = formatStatValue(String(diff.key), diff.before);
  const after = formatStatValue(String(diff.key), diff.after);
  return `${prefix}: ${displayLabel} ${formatStatSigned(String(diff.key), delta)} (${before}→${after})`;
}

function renderDiff(
  prefix: string,
  diff: AttackPlayerDiff,
  options?: DiffFormatOptions,
): string {
  if (diff.type === 'resource')
    return formatResourceDiff(prefix, diff, options);
  return formatStatDiff(prefix, diff);
}

function buildActionLog(
  entry: AttackOnDamageLogEntry,
  ctx: EngineContext,
): SummaryEntry {
  const id = entry.effect.params?.['id'] as string | undefined;
  let icon = '';
  let name = id || 'Unknown action';
  const transferPercents = new Map<ResourceKey, number>();
  if (id)
    try {
      const def = ctx.actions.get(id);
      icon = def.icon || '';
      name = def.name;
      const walk = (effects: EffectDef[] | undefined) => {
        if (!effects) return;
        for (const eff of effects) {
          if (
            eff.type === 'resource' &&
            eff.method === 'transfer' &&
            eff.params
          ) {
            const key =
              (eff.params['key'] as ResourceKey | undefined) ?? undefined;
            const pct = eff.params['percent'] as number | undefined;
            if (key && pct !== undefined && !transferPercents.has(key))
              transferPercents.set(key, pct);
          }
          if (Array.isArray(eff.effects))
            walk(eff.effects as EffectDef[] | undefined);
        }
      };
      walk(def.effects as EffectDef[] | undefined);
    } catch {
      /* ignore missing action */
    }
  const items: SummaryEntry[] = [];
  entry.defender.forEach((diff) => {
    const percent =
      diff.type === 'resource'
        ? transferPercents.get(diff.key as ResourceKey)
        : undefined;
    const options =
      percent !== undefined ? { percent } : { showPercent: true as const };
    items.push(renderDiff(ownerLabel('defender'), diff, options));
  });
  entry.attacker.forEach((diff) =>
    items.push(renderDiff(ownerLabel('attacker'), diff)),
  );
  return { title: `Triggered ${icon} ${name}`.trim(), items };
}

function buildOnDamageEntry(
  log: AttackLog['onDamage'],
  ctx: EngineContext,
  eff: EffectDef<Record<string, unknown>>,
): SummaryEntry | null {
  if (!log.length) return null;
  const { target, info } = getTargetInfo(eff);
  const targetFormatter = createAttackTargetFormatter(target);
  const items: SummaryEntry[] = [];
  const defenderEntries = log.filter((entry) => entry.owner === 'defender');
  const attackerEntries = log.filter((entry) => entry.owner === 'attacker');
  const ordered = defenderEntries.concat(attackerEntries);
  for (const entry of ordered) {
    if (entry.effect.type === 'action' && entry.effect.method === 'perform') {
      items.push(buildActionLog(entry, ctx));
      continue;
    }
    const percent =
      entry.effect.type === 'resource' &&
      entry.effect.method === 'transfer' &&
      entry.effect.params
        ? (entry.effect.params['percent'] as number | undefined)
        : undefined;
    entry.defender.forEach((diff) => {
      if (percent !== undefined)
        items.push(renderDiff(ownerLabel('defender'), diff, { percent }));
      else items.push(renderDiff(ownerLabel('defender'), diff));
    });
    entry.attacker.forEach((diff) =>
      items.push(renderDiff(ownerLabel('attacker'), diff)),
    );
  }
  if (!items.length) return null;
  return {
    title: targetFormatter.onDamageLogTitle(info),
    items,
  };
}

registerEffectFormatter('attack', 'perform', {
  summarize: (eff, ctx) => {
    const { entry } = baseEntry(eff, 'summarize');
    const parts: SummaryEntry[] = [entry];
    const onDamage = summarizeOnDamage(eff, ctx, 'summarize');
    if (onDamage) parts.push(onDamage);
    return parts;
  },
  describe: (eff, ctx) => {
    const { entry } = baseEntry(eff, 'describe');
    const parts: SummaryEntry[] = [entry];
    const onDamage = summarizeOnDamage(eff, ctx, 'describe');
    if (onDamage) parts.push(onDamage);
    return parts;
  },
  log: (eff, ctx) => {
    const log = ctx.pullEffectLog<AttackLog>('attack:perform');
    if (!log) return fallbackLog(eff, ctx);
    const entries: SummaryEntry[] = [buildEvaluationEntry(log.evaluation)];
    const onDamage = buildOnDamageEntry(log.onDamage, ctx, eff);
    if (onDamage) entries.push(onDamage);
    return entries;
  },
});
