import { RESOURCES, STATS } from '@kingdom-builder/contents';
import type { EffectDef } from '@kingdom-builder/engine';
import { Resource, Stat } from '@kingdom-builder/engine';
import type { SummaryEntry } from '../../content';
import {
  registerEffectFormatter,
  summarizeEffects,
  describeEffects,
  logEffects,
} from '../factory';

function baseAttackText(eff: EffectDef<Record<string, unknown>>) {
  const army = STATS[Stat.armyStrength];
  const castle = RESOURCES[Resource.castleHP];
  const absorption = STATS[Stat.absorption];
  const fort = STATS[Stat.fortificationStrength];
  let text = `Attack opponent's ${castle.icon} ${castle.label} with your ${army.icon} ${army.label}`;
  if (eff.params?.['ignoreAbsorption'])
    text += `, ignoring ${absorption.icon} ${absorption.label}`;
  if (eff.params?.['ignoreFortification'])
    text += `, ignoring ${fort.icon} ${fort.label}`;
  return { text, castle };
}

registerEffectFormatter('attack', 'perform', {
  summarize: (eff, ctx) => {
    const { text, castle } = baseAttackText(eff);
    const parts: SummaryEntry[] = [text];
    const onDamage = eff.params?.['onCastleDamage'] as
      | { attacker?: EffectDef[]; defender?: EffectDef[] }
      | undefined;
    if (onDamage?.attacker?.length) {
      parts.push({
        title: `On ${castle.icon} ${castle.label} damage (you)`,
        items: summarizeEffects(onDamage.attacker, ctx),
      });
    }
    if (onDamage?.defender?.length) {
      parts.push({
        title: `On ${castle.icon} ${castle.label} damage (opponent)`,
        items: summarizeEffects(onDamage.defender, ctx),
      });
    }
    return parts;
  },
  describe: (eff, ctx) => {
    const { text, castle } = baseAttackText(eff);
    const parts: SummaryEntry[] = [text];
    const onDamage = eff.params?.['onCastleDamage'] as
      | { attacker?: EffectDef[]; defender?: EffectDef[] }
      | undefined;
    if (onDamage?.attacker?.length) {
      parts.push({
        title: `On ${castle.icon} ${castle.label} damage (you)`,
        items: describeEffects(onDamage.attacker, ctx),
      });
    }
    if (onDamage?.defender?.length) {
      parts.push({
        title: `On ${castle.icon} ${castle.label} damage (opponent)`,
        items: describeEffects(onDamage.defender, ctx),
      });
    }
    return parts;
  },
  log: (eff, ctx) => {
    const { text, castle } = baseAttackText(eff);
    const parts: SummaryEntry[] = [text];
    const onDamage = eff.params?.['onCastleDamage'] as
      | { attacker?: EffectDef[]; defender?: EffectDef[] }
      | undefined;
    if (onDamage?.attacker?.length || onDamage?.defender?.length) {
      const items: SummaryEntry[] = [];
      if (onDamage.attacker?.length)
        items.push({
          title: 'Attacker',
          items: logEffects(onDamage.attacker, ctx),
        });
      if (onDamage.defender?.length)
        items.push({
          title: 'Defender',
          items: logEffects(onDamage.defender, ctx),
        });
      parts.push({ title: `On ${castle.icon} ${castle.label} damage`, items });
    }
    return parts;
  },
});
