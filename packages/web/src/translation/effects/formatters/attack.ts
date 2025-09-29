/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import {
  RESOURCES,
  STATS,
  Resource,
  Stat,
  type ResourceKey,
  type StatKey,
} from '@kingdom-builder/contents';
import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../content';
import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
  logEffects,
} from '../factory';

type DamageOwner = 'attacker' | 'defender';

function ownerLabel(owner: DamageOwner, capitalize = true) {
  if (owner === 'attacker') return capitalize ? 'You' : 'you';
  return capitalize ? 'Opponent' : 'opponent';
}

function ownerVerb(owner: DamageOwner, positive: boolean) {
  if (owner === 'attacker') return positive ? 'gain' : 'lose';
  return positive ? 'gains' : 'loses';
}

function formatLogResourceChange(
  def: EffectDef<Record<string, unknown>>,
  owner: DamageOwner,
): string | null {
  const params = def.params as
    | { key?: ResourceKey; amount?: number }
    | undefined;
  if (!params?.key || typeof params.amount !== 'number') return null;
  const amount = params.amount;
  const info = RESOURCES[params.key];
  const icon = info?.icon || params.key;
  const label = info?.label || params.key;
  const magnitude = Math.abs(amount);
  const formatted = Number.isInteger(magnitude)
    ? magnitude.toString()
    : magnitude.toLocaleString();
  return `${ownerLabel(owner)} ${ownerVerb(owner, amount >= 0)} ${formatted} ${icon} ${label}`;
}

function wrapActionLogEntry(
  entry: SummaryEntry,
  owner: DamageOwner,
): SummaryEntry {
  const actor = ownerLabel(owner);
  if (typeof entry === 'string')
    return `${owner === 'attacker' ? `${actor} trigger` : `${actor} triggers`} ${entry}`;
  return {
    ...entry,
    title: `${owner === 'attacker' ? `${actor} trigger` : `${actor} triggers`} ${entry.title}`,
  };
}

type Mode = 'summarize' | 'describe' | 'log';

type DamageEffectCategories = {
  [key: string]: (item: SummaryEntry, mode: Mode) => SummaryEntry[];
};

const DAMAGE_EFFECT_CATEGORIES: DamageEffectCategories = {
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

function baseEntry(eff: EffectDef<Record<string, unknown>>, mode: Mode) {
  const army = STATS[Stat.armyStrength];
  const absorption = STATS[Stat.absorption];
  const fort = STATS[Stat.fortificationStrength];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const targetParam = eff.params?.['target'] as
    | { type: 'resource'; key: ResourceKey }
    | { type: 'stat'; key: StatKey }
    | undefined;
  let targetInfo: { icon: string; label: string };
  if (targetParam?.type === 'stat') targetInfo = STATS[targetParam.key];
  else {
    const key: ResourceKey =
      targetParam && targetParam.type === 'resource'
        ? targetParam.key
        : Resource.castleHP;
    targetInfo = RESOURCES[key];
  }

  if (mode === 'summarize') {
    const title = `${army.icon} opponent's ${fort.icon}${targetInfo.icon}`;
    return { entry: title, target: targetInfo };
  }

  if (mode === 'log') {
    const items: SummaryEntry[] = [
      `Deal damage equal to your ${army.icon} ${army.label}`,
    ];
    if (eff.params?.['ignoreAbsorption'])
      items.push(
        `Ignore ${absorption.icon} ${absorption.label} damage reduction`,
      );
    else
      items.push(
        `${ownerLabel('defender')} reduces damage with ${absorption.icon} ${absorption.label}`,
      );

    if (eff.params?.['ignoreFortification'])
      items.push(
        `Apply damage directly to opponent's ${targetInfo.icon} ${targetInfo.label}`,
      );
    else {
      items.push(`Damage first hits opponent's ${fort.icon} ${fort.label}`);
      items.push(
        `Any leftover damage spills into ${targetInfo.icon} ${targetInfo.label}`,
      );
    }

    return {
      entry: {
        title: `Deal damage to opponent's ${targetInfo.icon} ${targetInfo.label}`,
        items,
      },
      target: targetInfo,
    };
  }

  const title = `Attack opponent with your ${army.icon} ${army.label}`;
  const items: SummaryEntry[] = [];

  if (eff.params?.['ignoreAbsorption'])
    items.push(
      `Ignoring ${absorption.icon} ${absorption.label} damage reduction`,
    );
  else
    items.push(
      `${absorption.icon} ${absorption.label} damage reduction applied`,
    );

  if (eff.params?.['ignoreFortification'])
    items.push(
      `Damage applied directly to opponent's ${targetInfo.icon} ${targetInfo.label}`,
    );
  else {
    items.push(`Damage applied to opponent's ${fort.icon} ${fort.label}`);
    items.push(
      `If opponent ${fort.icon} ${fort.label} reduced to 0, overflow remaining damage on opponent ${targetInfo.icon} ${targetInfo.label}`,
    );
  }

  return { entry: { title, items }, target: targetInfo };
}

function onDamageEntry(
  eff: EffectDef<Record<string, unknown>>,
  ctx: EngineContext,
  mode: Mode,
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const targetParam = eff.params?.['target'] as
    | { type: 'resource'; key: ResourceKey }
    | { type: 'stat'; key: StatKey }
    | undefined;
  let target: { icon: string; label: string };
  if (targetParam?.type === 'stat') target = STATS[targetParam.key];
  else {
    const key: ResourceKey =
      targetParam && targetParam.type === 'resource'
        ? targetParam.key
        : Resource.castleHP;
    target = RESOURCES[key];
  }
  const onDamage = eff.params?.['onDamage'] as
    | { attacker?: EffectDef[]; defender?: EffectDef[] }
    | undefined;
  if (!onDamage) return null;

  const format =
    mode === 'summarize'
      ? summarizeEffects
      : mode === 'describe'
        ? describeEffects
        : logEffects;

  const attackerDefs = onDamage.attacker ?? [];
  const defenderDefs = onDamage.defender ?? [];
  const attackerItems = format(attackerDefs, ctx);
  const defenderItems = format(defenderDefs, ctx);
  const items: SummaryEntry[] = [];
  const actionItems: SummaryEntry[] = [];

  function collect(
    defs: EffectDef[],
    entries: SummaryEntry[],
    owner: DamageOwner,
  ) {
    if (mode === 'log') {
      for (const def of defs) {
        const formatted = formatLogResourceChange(def, owner);
        if (formatted) {
          items.push(formatted);
          continue;
        }
        if (def.type === 'action' && def.method === 'perform') {
          const actionLogs = logEffects([def], ctx);
          actionItems.push(
            ...actionLogs.map((entry) => wrapActionLogEntry(entry, owner)),
          );
          continue;
        }
        const fallback = logEffects([def], ctx);
        const source = fallback.length ? fallback : describeEffects([def], ctx);
        source.forEach((entry) => {
          if (typeof entry === 'string')
            items.push(
              `${ownerLabel(owner)} ${
                owner === 'attacker' ? 'resolve' : 'suffers'
              }: ${entry}`,
            );
          else
            items.push({
              ...entry,
              title: `${ownerLabel(owner)} ${
                owner === 'attacker' ? 'resolve' : 'suffers'
              }: ${entry.title}`,
            });
        });
      }
      return;
    }

    entries.forEach((item, i) => {
      const def = defs[i]!;
      const { actions, others } = categorizeDamageEffects(def, item, mode);
      actionItems.push(...actions);
      others.forEach((o) => {
        if (typeof o === 'string')
          items.push(
            `${o} ${owner === 'attacker' ? 'for you' : 'for opponent'}`,
          );
        else
          items.push({
            ...o,
            title: `${o.title} ${
              owner === 'attacker' ? 'for you' : 'for opponent'
            }`,
          });
      });
    });
  }

  collect(defenderDefs, defenderItems, 'defender');
  collect(attackerDefs, attackerItems, 'attacker');

  const all = items.concat(actionItems);
  if (!all.length) return null;
  return {
    title:
      mode === 'summarize'
        ? `On opponent ${target.icon} damage`
        : mode === 'log'
          ? `When opponent's ${target.icon} ${target.label} takes damage`
          : `On opponent ${target.icon} ${target.label} damage`,
    items: all,
  };
}

registerEffectFormatter('attack', 'perform', {
  summarize: (eff, ctx) => {
    const { entry } = baseEntry(eff, 'summarize');
    const parts: SummaryEntry[] = [entry];
    const onDamage = onDamageEntry(eff, ctx, 'summarize');
    if (onDamage) parts.push(onDamage);
    return parts;
  },
  describe: (eff, ctx) => {
    const { entry } = baseEntry(eff, 'describe');
    const parts: SummaryEntry[] = [entry];
    const onDamage = onDamageEntry(eff, ctx, 'describe');
    if (onDamage) parts.push(onDamage);
    return parts;
  },
  log: (eff, ctx) => {
    const { entry } = baseEntry(eff, 'log');
    const parts: SummaryEntry[] = [entry];
    const onDamage = onDamageEntry(eff, ctx, 'log');
    if (onDamage) parts.push(onDamage);
    return parts;
  },
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
