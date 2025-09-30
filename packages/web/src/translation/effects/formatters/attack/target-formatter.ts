import type { SummaryEntry } from '../../../content';
import type { AttackLog } from '@kingdom-builder/engine';
import type { ResourceKey, StatKey } from '@kingdom-builder/contents';

type Mode = 'summarize' | 'describe';

type TargetInfo = { icon: string; label: string };

type AttackTarget =
  | { type: 'resource'; key: ResourceKey }
  | { type: 'stat'; key: StatKey }
  | { type: 'building'; id: string };

type StatInfo = { icon?: string; label: string };

type AttackEvaluationTarget = AttackLog['evaluation']['target'];
type NonBuildingEvaluationTarget = Extract<
  AttackEvaluationTarget,
  { type: 'resource' | 'stat' }
>;
type BuildingEvaluationTarget = Extract<
  AttackEvaluationTarget,
  { type: 'building' }
>;

type EvaluationContext = {
  army: StatInfo;
  absorption: StatInfo;
  fort: StatInfo;
  info: TargetInfo;
  targetLabel: string;
  formatNumber: (value: number) => string;
  formatPercent: (value: number) => string;
  formatStatValue: (key: string, value: number) => string;
};

type BaseEntryContext = {
  army: StatInfo;
  fort: StatInfo;
  info: TargetInfo;
  targetLabel: string;
};

type FortificationContext = {
  fort: StatInfo;
  info: TargetInfo;
  targetLabel: string;
};

type OnDamageTitleContext = {
  info: TargetInfo;
  summaryTarget: string;
  describeTarget: string;
};

type TargetFormatter = {
  summarizeBaseEntry(context: BaseEntryContext): string;
  describeFortificationItems(context: FortificationContext): string[];
  onDamageTitle(mode: Mode, context: OnDamageTitleContext): string;
  buildEvaluationEntry(
    log: AttackLog['evaluation'],
    context: EvaluationContext,
  ): SummaryEntry;
  onDamageLogTitle(info: TargetInfo): string;
};

const defaultTargetFormatter: TargetFormatter = {
  summarizeBaseEntry: ({ army, fort, info }) =>
    `${army.icon} opponent's ${fort.icon}${info.icon}`,
  describeFortificationItems: ({ fort, info }) => [
    `Damage applied to opponent's ${fort.icon} ${fort.label}`,
    `If opponent ${fort.icon} ${fort.label} reduced to 0, overflow remaining damage on opponent ${info.icon} ${info.label}`,
  ],
  onDamageTitle: (mode, { info }) =>
    mode === 'summarize'
      ? `On opponent ${info.icon} damage`
      : `On opponent ${info.icon} ${info.label} damage`,
  buildEvaluationEntry: (
    log,
    {
      army,
      absorption,
      fort,
      info,
      targetLabel: _targetLabel,
      formatNumber,
      formatPercent,
      formatStatValue,
    },
  ) => {
    const target = log.target as NonBuildingEvaluationTarget;
    const absorptionPart = log.absorption.ignored
      ? `${absorption.icon} ignored`
      : `${absorption.icon}${formatPercent(log.absorption.before)}`;
    const fortPart = log.fortification.ignored
      ? `${fort.icon} ignored`
      : `${fort.icon}${formatNumber(log.fortification.before)}`;

    const title = `Damage evaluation: ${army.icon}${formatNumber(log.power.modified)} vs. ${absorptionPart} ${fortPart} ${info.icon}${formatNumber(target.before)}`;
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

    const formatTargetValue = (value: number) =>
      target.type === 'stat'
        ? formatStatValue(String(target.key), value)
        : formatNumber(value);
    const targetDisplay = (value: number) =>
      info.icon
        ? `${info.icon}${formatTargetValue(value)}`
        : `${info.label} ${formatTargetValue(value)}`;

    items.push(
      `${army.icon}${formatNumber(target.damage)} vs. ${targetDisplay(target.before)} --> ${targetDisplay(target.after)}`,
    );

    return { title, items };
  },
  onDamageLogTitle: (info) =>
    `${info.icon} ${info.label} damage trigger evaluation`,
};

const buildingTargetFormatter: TargetFormatter = {
  summarizeBaseEntry: ({ army, targetLabel }) =>
    `${army.icon} destroy opponent's ${targetLabel}`,
  describeFortificationItems: ({ fort, targetLabel }) => [
    `Damage applied to opponent's ${fort.icon} ${fort.label}`,
    `If opponent ${fort.icon} ${fort.label} reduced to 0, overflow remaining damage attempts to destroy opponent ${targetLabel}`,
  ],
  onDamageTitle: (mode, { summaryTarget, describeTarget }) =>
    mode === 'summarize'
      ? `On opponent ${summaryTarget} destruction`
      : `On opponent ${describeTarget} destruction`,
  buildEvaluationEntry: (
    log,
    { army, absorption, fort, targetLabel, formatNumber, formatPercent },
  ) => {
    const target = log.target as BuildingEvaluationTarget;
    const absorptionPart = log.absorption.ignored
      ? `${absorption.icon} ignored`
      : `${absorption.icon}${formatPercent(log.absorption.before)}`;
    const fortPart = log.fortification.ignored
      ? `${fort.icon} ignored`
      : `${fort.icon}${formatNumber(log.fortification.before)}`;

    const title = `Damage evaluation: ${army.icon}${formatNumber(log.power.modified)} vs. ${absorptionPart} ${fortPart} ${targetLabel}`;
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

    if (!target.existed) items.push(`No ${targetLabel} to destroy`);
    else {
      const damageText = `${army.icon}${formatNumber(target.damage)}`;
      items.push(
        target.destroyed
          ? `${damageText} destroys ${targetLabel}`
          : `${damageText} fails to destroy ${targetLabel}`,
      );
    }

    return { title, items };
  },
  onDamageLogTitle: (info) =>
    `${info.icon} ${info.label} destruction trigger evaluation`,
};

export function createAttackTargetFormatter(
  target: AttackTarget,
): TargetFormatter {
  if (target.type === 'building') return buildingTargetFormatter;
  return defaultTargetFormatter;
}
