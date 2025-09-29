import {
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

type Mode = 'summarize' | 'describe';

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

function getTargetInfo(eff: EffectDef<Record<string, unknown>>): {
  target:
    | { type: 'resource'; key: ResourceKey }
    | { type: 'stat'; key: StatKey };
  info: { icon: string; label: string };
} {
  const targetParam = eff.params?.['target'] as
    | { type: 'resource'; key: ResourceKey }
    | { type: 'stat'; key: StatKey }
    | undefined;
  if (targetParam?.type === 'stat')
    return { target: targetParam, info: STATS[targetParam.key] };
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
  const { info } = getTargetInfo(eff);

  if (mode === 'summarize') {
    return {
      entry: `${army.icon} opponent's ${fort.icon}${info.icon}`,
      target: info,
    };
  }

  return {
    entry: {
      title: `Attack opponent with your ${army.icon} ${army.label}`,
      items: [
        `${absorption.icon} ${absorption.label} damage reduction applied`,
        `Damage applied to opponent's ${fort.icon} ${fort.label}`,
        `If opponent ${fort.icon} ${fort.label} reduced to 0, overflow remaining damage on opponent ${info.icon} ${info.label}`,
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
  const { info } = getTargetInfo(eff);
  const format = mode === 'summarize' ? summarizeEffects : describeEffects;
  const attacker = format(onDamage.attacker, ctx);
  const defender = format(onDamage.defender, ctx);
  const items: SummaryEntry[] = [];
  if (defender.length)
    items.push({
      title: 'Opponent',
      items: defender,
      ...(mode === 'describe' ? { _desc: true } : {}),
    });
  if (attacker.length)
    items.push({
      title: 'You',
      items: attacker,
      ...(mode === 'describe' ? { _desc: true } : {}),
    });
  if (!items.length) return null;
  return {
    title: `On opponent ${info.icon} ${info.label} damage`,
    items,
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
    log.target.type === 'stat'
      ? STATS[log.target.key as StatKey]
      : RESOURCES[log.target.key as ResourceKey];
  const absorptionPart = log.absorption.ignored
    ? `${absorption.icon} ignored`
    : `${absorption.icon}${formatPercent(log.absorption.before)}`;
  const fortPart = log.fortification.ignored
    ? `${fort.icon} ignored`
    : `${fort.icon}${formatNumber(log.fortification.before)}`;
  const title = `Damage evaluation: ${army.icon}${formatNumber(log.power.modified)} vs. ${absorptionPart} ${fortPart} ${targetInfo.icon}${formatNumber(log.target.before)}`;
  const items: SummaryEntry[] = [];

  if (log.absorption.ignored)
    items.push(
      `${army.icon}${formatNumber(log.power.modified)} ignores ${absorption.icon} ${absorption.label}`,
    );
  else
    items.push(
      `${army.icon}${formatNumber(log.power.modified)} vs. ${absorption.icon}${formatPercent(log.absorption.before)} --> ${army.icon}${formatNumber(log.absorption.damageAfter)}`,
    );

  if (log.fortification.ignored)
    items.push(
      `${army.icon}${formatNumber(log.absorption.damageAfter)} bypasses ${fort.icon} ${fort.label}`,
    );
  else {
    const remaining = Math.max(
      0,
      log.absorption.damageAfter - log.fortification.damage,
    );
    items.push(
      `${army.icon}${formatNumber(log.absorption.damageAfter)} vs. ${fort.icon}${formatNumber(log.fortification.before)} --> ${fort.icon}${formatNumber(log.fortification.after)} ${army.icon}${formatNumber(remaining)}`,
    );
  }

  items.push(
    `${army.icon}${formatNumber(log.target.damage)} vs. ${targetInfo.icon}${formatNumber(log.target.before)} --> ${targetInfo.icon}${formatNumber(log.target.after)}`,
  );

  return { title, items };
}

function formatResourceDiff(
  prefix: string,
  diff: AttackPlayerDiff,
  includePercent: boolean,
): string {
  const info = RESOURCES[diff.key as ResourceKey];
  const icon = info?.icon || diff.key;
  const label = info?.label || diff.key;
  const delta = diff.after - diff.before;
  const before = formatNumber(diff.before);
  const after = formatNumber(diff.after);
  if (includePercent && diff.before !== 0) {
    const pct = (delta / diff.before) * 100;
    if (pct !== 0)
      return `${prefix}: ${icon}${label} ${formatSigned(pct)}% (${before}→${after}) (${formatSigned(delta)})`;
  }
  return `${prefix}: ${icon}${label} ${formatSigned(delta)} (${before}→${after})`;
}

function formatStatDiff(prefix: string, diff: AttackPlayerDiff): string {
  const info = STATS[diff.key as StatKey];
  const icon = info?.icon || diff.key;
  const label = info?.label || diff.key;
  const delta = diff.after - diff.before;
  const before = formatStatValue(String(diff.key), diff.before);
  const after = formatStatValue(String(diff.key), diff.after);
  return `${prefix}: ${icon}${label} ${formatStatSigned(String(diff.key), delta)} (${before}→${after})`;
}

function renderDiff(
  prefix: string,
  diff: AttackPlayerDiff,
  includePercent = false,
): string {
  if (diff.type === 'resource')
    return formatResourceDiff(prefix, diff, includePercent);
  return formatStatDiff(prefix, diff);
}

function buildActionLog(
  entry: AttackOnDamageLogEntry,
  ctx: EngineContext,
): SummaryEntry {
  const id = entry.effect.params?.['id'] as string | undefined;
  let icon = '';
  let name = id || 'Unknown action';
  if (id)
    try {
      const def = ctx.actions.get(id);
      icon = def.icon || '';
      name = def.name;
    } catch {
      /* ignore missing action */
    }
  const items: SummaryEntry[] = [];
  entry.defender.forEach((diff) =>
    items.push(renderDiff(ownerLabel('defender'), diff, true)),
  );
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
  const { info } = getTargetInfo(eff);
  const items: SummaryEntry[] = [];
  const defenderEntries = log.filter((entry) => entry.owner === 'defender');
  const attackerEntries = log.filter((entry) => entry.owner === 'attacker');
  const ordered = defenderEntries.concat(attackerEntries);
  for (const entry of ordered) {
    if (entry.effect.type === 'action' && entry.effect.method === 'perform') {
      items.push(buildActionLog(entry, ctx));
      continue;
    }
    entry.defender.forEach((diff) =>
      items.push(renderDiff(ownerLabel('defender'), diff)),
    );
    entry.attacker.forEach((diff) =>
      items.push(renderDiff(ownerLabel('attacker'), diff)),
    );
  }
  if (!items.length) return null;
  return {
    title: `${info.icon} ${info.label} damage trigger evaluation`,
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
