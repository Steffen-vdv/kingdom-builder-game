import { RESOURCES, STATS, Resource, Stat } from '@kingdom-builder/contents';
import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../content';
import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
  logEffects,
} from '../factory';

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
  const castle = RESOURCES[Resource.castleHP];
  const absorption = STATS[Stat.absorption];
  const fort = STATS[Stat.fortificationStrength];

  if (mode === 'summarize') {
    const title = `${army.icon} opponent's ${fort.icon}${castle.icon}`;
    return { entry: title, castle };
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
      `Damage applied directly to opponent's ${castle.icon} ${castle.label}`,
    );
  else {
    items.push(`Damage applied to opponent's ${fort.icon} ${fort.label}`);
    items.push(
      `If opponent ${fort.icon} ${fort.label} reduced to 0, overflow remaining damage on opponent ${castle.icon} ${castle.label}`,
    );
  }

  return { entry: { title, items }, castle };
}

function onCastleDamageEntry(
  eff: EffectDef<Record<string, unknown>>,
  ctx: EngineContext,
  mode: Mode,
) {
  const castle = RESOURCES[Resource.castleHP];
  const onDamage = eff.params?.['onCastleDamage'] as
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

  function collect(defs: EffectDef[], entries: SummaryEntry[], suffix: string) {
    entries.forEach((item, i) => {
      const def = defs[i]!;
      const { actions, others } = categorizeDamageEffects(def, item, mode);
      actionItems.push(...actions);
      others.forEach((o) => {
        if (typeof o === 'string') items.push(`${o} ${suffix}`);
        else items.push({ ...o, title: `${o.title} ${suffix}` });
      });
    });
  }

  collect(defenderDefs, defenderItems, 'for opponent');
  collect(attackerDefs, attackerItems, 'for you');

  const all = items.concat(actionItems);
  if (!all.length) return null;
  return {
    title:
      mode === 'summarize'
        ? `On opponent ${castle.icon} damage`
        : `On opponent ${castle.icon} ${castle.label} damage`,
    items: all,
  };
}

registerEffectFormatter('attack', 'perform', {
  summarize: (eff, ctx) => {
    const { entry } = baseEntry(eff, 'summarize');
    const parts: SummaryEntry[] = [entry];
    const onDamage = onCastleDamageEntry(eff, ctx, 'summarize');
    if (onDamage) parts.push(onDamage);
    return parts;
  },
  describe: (eff, ctx) => {
    const { entry } = baseEntry(eff, 'describe');
    const parts: SummaryEntry[] = [entry];
    const onDamage = onCastleDamageEntry(eff, ctx, 'describe');
    if (onDamage) parts.push(onDamage);
    return parts;
  },
  log: (eff, ctx) => {
    const { entry } = baseEntry(eff, 'describe');
    const parts: SummaryEntry[] = [entry];
    const onDamage = onCastleDamageEntry(eff, ctx, 'log');
    if (onDamage) parts.push(onDamage);
    return parts;
  },
});
