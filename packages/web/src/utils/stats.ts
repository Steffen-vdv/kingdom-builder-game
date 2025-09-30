import {
  STATS,
  POPULATION_ROLES,
  BUILDINGS,
  DEVELOPMENTS,
  PHASES,
  ACTIONS,
  RESOURCES,
  TRIGGER_INFO,
  PASSIVE_INFO,
} from '@kingdom-builder/contents';
import type {
  EngineContext,
  StatKey,
  StatSourceContribution,
  StatSourceLink,
  StatSourceMeta,
} from '@kingdom-builder/engine';
import type { Summary, SummaryEntry } from '../translation/content/types';

export function statDisplaysAsPercent(key: string): boolean {
  const info = STATS[key as keyof typeof STATS];
  return Boolean(info?.displayAsPercent ?? info?.addFormat?.percent);
}

export function formatStatValue(key: string, value: number): string {
  return statDisplaysAsPercent(key) ? `${value * 100}%` : String(value);
}

function isStatKey(key: string): key is StatKey {
  return key in STATS;
}

type SourceDescriptor = {
  icon: string;
  label: string;
  suffix?: string;
};

type EntityDescriptor = {
  icon: string;
  label: string;
};

const TRIGGER_LOOKUP = TRIGGER_INFO as Record<
  string,
  { icon?: string; future?: string; past?: string }
>;

export function getStatBreakdownSummary(
  statKey: string,
  player: EngineContext['activePlayer'],
  ctx: EngineContext,
): Summary {
  if (!isStatKey(statKey)) return [];
  const sources = player.statSources?.[statKey] ?? {};
  const contributions = Object.values(sources);
  if (!contributions.length) return [];
  const annotated = contributions.map((entry) => ({
    entry,
    descriptor: getSourceDescriptor(entry.meta),
  }));
  annotated.sort((a, b) => {
    const aOrder = a.entry.meta.longevity === 'ongoing' ? 0 : 1;
    const bOrder = b.entry.meta.longevity === 'ongoing' ? 0 : 1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.descriptor.label.localeCompare(b.descriptor.label);
  });
  return annotated.map(({ entry, descriptor }) =>
    formatContribution(statKey, entry, descriptor, player, ctx),
  );
}

function resolveEntity(kind?: string, id?: string): EntityDescriptor {
  switch (kind) {
    case 'population': {
      const role = POPULATION_ROLES[id as keyof typeof POPULATION_ROLES];
      return {
        icon: role?.icon ?? '',
        label: role?.label ?? id ?? 'Population',
      };
    }
    case 'building':
      if (id && BUILDINGS.has(id)) {
        const building = BUILDINGS.get(id);
        return { icon: building.icon ?? '', label: building.name ?? id };
      }
      return { icon: '', label: id ?? 'Building' };
    case 'development':
      if (id && DEVELOPMENTS.has(id)) {
        const development = DEVELOPMENTS.get(id);
        return { icon: development.icon ?? '', label: development.name ?? id };
      }
      return { icon: '', label: id ?? 'Development' };
    case 'phase': {
      const phase = id ? PHASES.find((p) => p.id === id) : undefined;
      return { icon: phase?.icon ?? '', label: phase?.label ?? id ?? 'Phase' };
    }
    case 'action':
      if (id && ACTIONS.has(id)) {
        const action = ACTIONS.get(id);
        return { icon: action.icon ?? '', label: action.name ?? id };
      }
      return { icon: '', label: id ?? 'Action' };
    case 'stat':
      if (id) {
        const statInfo = STATS[id as keyof typeof STATS];
        return { icon: statInfo?.icon ?? '', label: statInfo?.label ?? id };
      }
      return { icon: '', label: 'Stat' };
    case 'resource':
      if (id) {
        const resource = RESOURCES[id as keyof typeof RESOURCES];
        return { icon: resource?.icon ?? '', label: resource?.label ?? id };
      }
      return { icon: '', label: 'Resource' };
    case 'trigger':
      if (id) {
        const info = TRIGGER_LOOKUP[id];
        if (info)
          return {
            icon: info.icon ?? '',
            label: info.past ?? info.future ?? id,
          };
      }
      return { icon: '', label: id ?? 'Trigger' };
    case 'passive':
      return {
        icon: PASSIVE_INFO.icon ?? '',
        label: PASSIVE_INFO.label ?? 'Passive',
      };
    case 'land':
      return { icon: '', label: id ?? 'Land' };
    case 'start':
      return { icon: '', label: 'Initial setup' };
    default:
      return { icon: '', label: id ?? kind ?? 'Source' };
  }
}

function getSourceDescriptor(meta: StatSourceMeta): SourceDescriptor {
  if (meta.kind === 'phase') {
    const base = resolveEntity(meta.kind, meta.id);
    const descriptor: SourceDescriptor = {
      icon: base.icon,
      label: base.label,
    };
    const suffix = formatStepLabel(meta.id, meta.detail);
    if (suffix) descriptor.suffix = suffix;
    return descriptor;
  }
  const base = resolveEntity(meta.kind, meta.id);
  const descriptor: SourceDescriptor = {
    icon: base.icon,
    label: base.label,
  };
  const suffix = formatDetail(meta.kind, meta.id, meta.detail);
  if (suffix) descriptor.suffix = suffix;
  return descriptor;
}

function formatContribution(
  statKey: string,
  contribution: StatSourceContribution,
  descriptor: SourceDescriptor,
  player: EngineContext['activePlayer'],
  ctx: EngineContext,
): SummaryEntry {
  const { amount, meta } = contribution;
  const statInfo = STATS[statKey as keyof typeof STATS];
  const valueStr = formatStatValue(statKey, amount);
  const sign = amount >= 0 ? '+' : '';
  const amountParts: string[] = [];
  if (statInfo?.icon) amountParts.push(statInfo.icon);
  amountParts.push(`${sign}${valueStr}`);
  if (statInfo?.label) amountParts.push(statInfo.label);
  const amountEntry = amountParts.join(' ').trim();
  const detailEntries = buildDetailEntries(meta, player, ctx);
  const title = formatSourceTitle(descriptor);
  if (!title) {
    if (!detailEntries.length) return amountEntry;
    return { title: amountEntry, items: detailEntries };
  }
  const items: SummaryEntry[] = [];
  pushSummaryEntry(items, amountEntry);
  detailEntries.forEach((entry) => pushSummaryEntry(items, entry));
  return { title, items };
}

function formatSourceTitle(descriptor: SourceDescriptor): string {
  const titleParts: string[] = [];
  if (descriptor.icon) titleParts.push(descriptor.icon);
  const labelParts: string[] = [];
  if (descriptor.label?.trim()) labelParts.push(descriptor.label.trim());
  if (descriptor.suffix?.trim()) labelParts.push(descriptor.suffix.trim());
  if (labelParts.length)
    titleParts.push(
      labelParts.length > 1
        ? `${labelParts[0]!} · ${labelParts.slice(1).join(' · ')}`
        : labelParts[0]!,
    );
  return titleParts.join(' ').trim();
}

function buildDetailEntries(
  meta: StatSourceMeta,
  player: EngineContext['activePlayer'],
  ctx: EngineContext,
): SummaryEntry[] {
  const dependencies = (meta.dependsOn ?? [])
    .map((dep) => formatDependency(dep, player, ctx))
    .filter((text) => text.length > 0);
  const removal = meta.removal
    ? formatDependency(meta.removal, player, ctx, { includeCounts: false })
    : undefined;
  const entries: SummaryEntry[] = [];
  buildLongevityEntries(meta, dependencies, removal).forEach((entry) =>
    pushSummaryEntry(entries, entry),
  );
  buildHistoryEntries(meta).forEach((entry) =>
    pushSummaryEntry(entries, entry),
  );
  return entries;
}

function buildLongevityEntries(
  meta: StatSourceMeta,
  dependencies: string[],
  removal?: string,
): SummaryEntry[] {
  const entries: SummaryEntry[] = [];
  if (meta.longevity === 'ongoing') {
    const items: SummaryEntry[] = [];
    if (!dependencies.length) pushSummaryEntry(items, 'Active at all times');
    else if (dependencies.length === 1)
      pushSummaryEntry(items, `While ${dependencies[0]}`);
    else
      pushSummaryEntry(items, {
        title: 'While all of:',
        items: dependencies,
      });
    if (removal) pushSummaryEntry(items, `Removed when ${removal}`);
    if (items.length)
      entries.push({
        title: `${PASSIVE_INFO.icon ?? '♾️'} Ongoing`,
        items,
      });
    else entries.push(`${PASSIVE_INFO.icon ?? '♾️'} Ongoing`);
    return entries;
  }
  const items: SummaryEntry[] = [];
  if (!dependencies.length)
    pushSummaryEntry(items, 'Applies immediately and remains in effect');
  else
    dependencies.forEach((dep) =>
      pushSummaryEntry(items, `Triggered by ${dep}`),
    );
  if (removal) pushSummaryEntry(items, `Can be removed when ${removal}`);
  if (items.length) entries.push({ title: 'Permanent', items });
  else entries.push('Permanent');
  return entries;
}

function buildHistoryEntries(meta: StatSourceMeta): SummaryEntry[] {
  const extra = meta.extra;
  if (!extra) return [];
  const entries: SummaryEntry[] = [];
  const seen = new Set<string>();
  const add = (text: string | undefined) => {
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    pushSummaryEntry(entries, trimmed);
  };
  const history = extra['history'];
  if (Array.isArray(history))
    history.forEach((item) => add(formatHistoryItem(item)));
  const triggerLabels = extractTriggerList(extra);
  triggerLabels.forEach((label) => add(`Triggered by ${label}`));
  const turns = new Set<number>();
  if (typeof extra['turn'] === 'number') turns.add(extra['turn']);
  if (Array.isArray(extra['turns']))
    extra['turns'].forEach((value) => {
      if (typeof value === 'number') turns.add(value);
    });
  const phaseHint = formatPhaseStep(
    typeof extra['phase'] === 'string' ? extra['phase'] : undefined,
    typeof extra['step'] === 'string' ? extra['step'] : undefined,
  );
  if (turns.size) {
    Array.from(turns)
      .sort((a, b) => a - b)
      .forEach((turn) =>
        add(phaseHint ? `Turn ${turn} – ${phaseHint}` : `Turn ${turn}`),
      );
  } else if (phaseHint) add(phaseHint);
  return entries;
}

function extractTriggerList(extra: Record<string, unknown>): string[] {
  const triggers: string[] = [];
  const list = extra['triggers'];
  if (Array.isArray(list))
    list.forEach((value) => {
      if (typeof value === 'string') {
        const label = formatTriggerLabel(value);
        if (label) triggers.push(label);
      }
    });
  if (typeof extra['trigger'] === 'string') {
    const label = formatTriggerLabel(extra['trigger']);
    if (label) triggers.push(label);
  }
  return triggers;
}

function formatTriggerLabel(id: string): string | undefined {
  if (!id) return undefined;
  const info = TRIGGER_LOOKUP[id];
  if (info) {
    const parts: string[] = [];
    if (info.icon) parts.push(info.icon);
    const label = info.past ?? info.future ?? id;
    if (label) parts.push(label);
    return parts.join(' ').trim();
  }
  return id;
}

function formatHistoryItem(entry: unknown): string | undefined {
  if (typeof entry === 'number') return `Turn ${entry}`;
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return undefined;
  const record = entry as Record<string, unknown>;
  const turn = typeof record['turn'] === 'number' ? record['turn'] : undefined;
  const phaseId =
    typeof record['phase'] === 'string' ? record['phase'] : undefined;
  const stepId =
    typeof record['step'] === 'string'
      ? record['step']
      : typeof record['detail'] === 'string'
        ? record['detail']
        : undefined;
  const phaseName =
    typeof record['phaseName'] === 'string' ? record['phaseName'] : undefined;
  const stepName =
    typeof record['stepName'] === 'string' ? record['stepName'] : undefined;
  const phaseText =
    formatPhaseStep(phaseId, stepId) ||
    [phaseName, stepName].filter((part) => Boolean(part)).join(' · ');
  const description =
    typeof record['description'] === 'string'
      ? record['description']
      : undefined;
  const parts: string[] = [];
  if (turn !== undefined) parts.push(`Turn ${turn}`);
  if (phaseText) parts.push(phaseText);
  if (description) parts.push(description);
  if (!parts.length) return undefined;
  return parts.join(' – ');
}

function formatPhaseStep(
  phaseId?: string,
  stepId?: string,
): string | undefined {
  if (!phaseId) return undefined;
  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) return undefined;
  const parts: string[] = [];
  if (phase.icon) parts.push(phase.icon);
  if (phase.label) parts.push(phase.label);
  const base = parts.join(' ').trim();
  const stepText = formatStepLabel(phaseId, stepId);
  if (stepText) return base ? `${base} · ${stepText}` : stepText;
  return base || undefined;
}

function formatStepLabel(
  phaseId?: string,
  stepId?: string,
): string | undefined {
  if (!stepId) return undefined;
  const phase = phaseId ? PHASES.find((p) => p.id === phaseId) : undefined;
  const step = phase?.steps.find((s) => s.id === stepId);
  if (!step) return formatDetailText(stepId);
  const parts: string[] = [];
  if (step.icon) parts.push(step.icon);
  const label = step.title ?? step.id;
  if (label) parts.push(label);
  return parts.join(' ').trim();
}

function formatDetail(
  kind?: string,
  id?: string,
  detail?: string,
): string | undefined {
  if (!detail) return undefined;
  if (kind === 'phase') return formatStepLabel(id, detail);
  return formatDetailText(detail);
}

function formatDetailText(detail: string): string {
  if (!detail) return '';
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(detail))
    return detail
      .split('-')
      .filter((segment) => segment.length)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');
  if (/^[a-z]/.test(detail))
    return detail.charAt(0).toUpperCase() + detail.slice(1);
  return detail;
}

function formatDependency(
  dep: StatSourceLink,
  player: EngineContext['activePlayer'],
  ctx: EngineContext,
  options: { includeCounts?: boolean } = {},
): string {
  if (dep.type === 'phase')
    return (
      formatPhaseStep(dep.id, dep.detail) ||
      resolveEntity(dep.type, dep.id).label
    ).trim();
  const entity = resolveEntity(dep.type, dep.id);
  const fragments: string[] = [];
  if (entity.icon) fragments.push(entity.icon);
  if (entity.label) fragments.push(entity.label);
  let detail = formatDetail(dep.type, dep.id, dep.detail);
  const includeCounts = options.includeCounts ?? true;
  if (includeCounts && dep.type === 'population' && dep.id) {
    const count = player.population?.[dep.id] ?? 0;
    if (count > 0) detail = detail ? `${detail} ×${count}` : `×${count}`;
  }
  if (dep.type === 'stat' && dep.id) {
    const statValue =
      player.stats?.[dep.id] ?? ctx.activePlayer.stats?.[dep.id] ?? 0;
    const valueStr = formatStatValue(dep.id, statValue);
    detail = detail ? `${detail} ${valueStr}` : valueStr;
  }
  if (detail) fragments.push(detail);
  return fragments.join(' ').replace(/\s+/g, ' ').trim();
}

function normalizeSummaryEntry(entry: SummaryEntry): SummaryEntry | undefined {
  if (typeof entry === 'string') {
    const trimmed = entry.trim();
    return trimmed.length ? trimmed : undefined;
  }
  const { title, items, ...rest } = entry;
  const normalizedItems = items
    .map((item) => normalizeSummaryEntry(item))
    .filter((item): item is SummaryEntry => Boolean(item));
  const trimmedTitle = title.trim();
  if (!trimmedTitle && !normalizedItems.length) return undefined;
  return { title: trimmedTitle || title, items: normalizedItems, ...rest };
}

function pushSummaryEntry(
  target: SummaryEntry[],
  entry: SummaryEntry | undefined,
) {
  if (!entry) return;
  const normalized = normalizeSummaryEntry(entry);
  if (normalized) target.push(normalized);
}
