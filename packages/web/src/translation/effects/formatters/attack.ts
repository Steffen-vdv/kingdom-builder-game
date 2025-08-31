import { RESOURCES, STATS } from '@kingdom-builder/contents';
import type { EffectDef, EngineContext } from '@kingdom-builder/engine';
import { Resource, Stat } from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../content';
import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
  logEffects,
} from '../factory';

type Mode = 'summarize' | 'describe' | 'log';

function baseEntry(eff: EffectDef<Record<string, unknown>>, mode: Mode) {
  const army = STATS[Stat.armyStrength];
  const castle = RESOURCES[Resource.castleHP];
  const absorption = STATS[Stat.absorption];
  const fort = STATS[Stat.fortificationStrength];
  const title = `Attack opponent with your ${army.icon} ${army.label}`;
  const items: SummaryEntry[] = [];

  if (mode === 'describe') {
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
  } else {
    if (eff.params?.['ignoreAbsorption'])
      items.push(`Ignore ${absorption.icon} ${absorption.label}`);
    else items.push(`${absorption.icon} reduces damage`);

    if (eff.params?.['ignoreFortification'])
      items.push(`Hits ${castle.icon} ${castle.label} directly`);
    else items.push(`Hits opponent's ${fort.icon} then ${castle.icon}`);
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

  attackerItems.forEach((item, i) => {
    const def = attackerDefs[i]!;
    if (def.type === 'action' && def.method === 'perform')
      actionItems.push(item);
    else if (typeof item === 'string') items.push(`${item} for you`);
    else items.push({ ...item, title: `${item.title} for you` });
  });

  defenderItems.forEach((item, i) => {
    const def = defenderDefs[i]!;
    if (def.type === 'action' && def.method === 'perform')
      actionItems.push(item);
    else if (typeof item === 'string') items.push(`${item} for opponent`);
    else items.push({ ...item, title: `${item.title} for opponent` });
  });

  const all = items.concat(actionItems);
  if (!all.length) return null;
  return {
    title: `On opponent ${castle.icon} ${castle.label} damage`,
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
