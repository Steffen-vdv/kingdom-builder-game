import {
  STATS,
  POPULATION_ROLES,
  BUILDINGS,
  DEVELOPMENTS,
  PHASES,
  ACTIONS,
} from '@kingdom-builder/contents';
import type {
  EngineContext,
  StatKey,
  StatSourceContribution,
  StatSourceLink,
  StatSourceMeta,
} from '@kingdom-builder/engine';
import type { Summary } from '../translation/content/types';

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
    case 'start':
      return { icon: '', label: 'Initial setup' };
    default:
      return { icon: '', label: id ?? kind ?? 'Source' };
  }
}

function getSourceDescriptor(meta: StatSourceMeta): SourceDescriptor {
  if (meta.kind === 'phase') {
    const base = resolveEntity(meta.kind, meta.id);
    const phase = meta.id ? PHASES.find((p) => p.id === meta.id) : undefined;
    const step = meta.detail
      ? phase?.steps.find((s) => s.id === meta.detail)
      : undefined;
    const descriptor: SourceDescriptor = {
      icon: step?.icon ?? base.icon,
      label: base.label,
    };
    const suffix = step?.title ?? meta.detail;
    if (suffix) descriptor.suffix = suffix;
    return descriptor;
  }
  const base = resolveEntity(meta.kind, meta.id);
  const descriptor: SourceDescriptor = {
    icon: base.icon,
    label: base.label,
  };
  if (meta.detail) descriptor.suffix = meta.detail;
  return descriptor;
}

function formatContribution(
  statKey: string,
  contribution: StatSourceContribution,
  descriptor: SourceDescriptor,
  player: EngineContext['activePlayer'],
  ctx: EngineContext,
): string {
  const { amount, meta } = contribution;
  const statInfo = STATS[statKey as keyof typeof STATS];
  const statIcon = statInfo?.icon ?? '';
  const valueStr = formatStatValue(statKey, amount);
  const sign = amount >= 0 ? '+' : '';
  const headerParts: string[] = [];
  if (descriptor.icon) headerParts.push(descriptor.icon);
  const label = descriptor.suffix
    ? `${descriptor.label} · ${descriptor.suffix}`
    : descriptor.label;
  if (label.trim().length) headerParts.push(label.trim());
  const header = headerParts.join(' ').trim();
  const amountPart = `${statIcon ? `${statIcon} ` : ''}${sign}${valueStr}`;
  const note = buildNote(meta, player, ctx);
  if (header) return `${header}: ${amountPart}${note ? ` (${note})` : ''}`;
  return `${amountPart}${note ? ` (${note})` : ''}`;
}

function buildNote(
  meta: StatSourceMeta,
  player: EngineContext['activePlayer'],
  ctx: EngineContext,
): string {
  const dependencies = (meta.dependsOn ?? [])
    .map((dep) => formatDependency(dep, player, ctx))
    .filter((text) => text.length > 0);
  const removal = meta.removal
    ? formatDependency(meta.removal, player, ctx, { includeCounts: false })
    : undefined;
  if (meta.longevity === 'ongoing') {
    const parts: string[] = [];
    let ongoing = 'ongoing';
    if (dependencies.length) ongoing += ` while ${joinWithAnd(dependencies)}`;
    parts.push(ongoing);
    if (removal && removal.length) parts.push(`removed when ${removal}`);
    return parts.join('; ');
  }
  const parts = ['permanent'];
  if (dependencies.length)
    parts.push(`triggered by ${joinWithAnd(dependencies)}`);
  return parts.join('; ');
}

function formatDependency(
  dep: StatSourceLink,
  player: EngineContext['activePlayer'],
  ctx: EngineContext,
  options: { includeCounts?: boolean } = {},
): string {
  const entity = resolveEntity(dep.type, dep.id);
  const fragments: string[] = [];
  if (entity.icon) fragments.push(entity.icon);
  if (entity.label) fragments.push(entity.label);
  let detail = dep.detail ? dep.detail.trim() : '';
  const includeCounts = options.includeCounts ?? true;
  if (includeCounts && dep.type === 'population' && dep.id) {
    const count = player.population?.[dep.id] ?? 0;
    if (count > 0) detail = detail ? `${detail} (${count})` : `(${count})`;
  }
  if (dep.type === 'stat' && dep.id) {
    const statValue =
      player.stats?.[dep.id] ?? ctx.activePlayer.stats?.[dep.id] ?? 0;
    const valueStr = formatStatValue(dep.id, statValue);
    detail = detail ? `${detail} ${valueStr}` : valueStr;
  }
  if (detail) fragments.push(detail);
  return fragments.join(' ').trim();
}

function joinWithAnd(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]!} and ${parts[1]!}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]!}`;
}
