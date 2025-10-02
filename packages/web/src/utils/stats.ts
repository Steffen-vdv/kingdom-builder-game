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

type DescriptorDetailFormatter = (
	id: string | undefined,
	detail: string | undefined,
) => string | undefined;

type DescriptorDependencyAugmenter = (
	detail: string | undefined,
	dep: StatSourceLink,
	player: EngineContext['activePlayer'],
	ctx: EngineContext,
	options: { includeCounts?: boolean },
) => string | undefined;

type DescriptorDependencyFormatter = (
	dep: StatSourceLink,
	player: EngineContext['activePlayer'],
	ctx: EngineContext,
	options: { includeCounts?: boolean },
) => string;

type DescriptorRegistryEntry = {
	resolve(id?: string): EntityDescriptor;
	formatDetail?: DescriptorDetailFormatter;
	augmentDependencyDetail?: DescriptorDependencyAugmenter;
	formatDependency?: DescriptorDependencyFormatter;
};

const TRIGGER_LOOKUP = TRIGGER_INFO as Record<
	string,
	{ icon?: string; future?: string; past?: string }
>;

const defaultFormatDetail: DescriptorDetailFormatter = (_id, detail) =>
	detail ? formatDetailText(detail) : undefined;

const defaultResolve =
	(labelFallback: string): DescriptorRegistryEntry['resolve'] =>
	(id) => ({
		icon: '',
		label: id ?? labelFallback,
	});

const DESCRIPTOR_REGISTRY: Record<string, DescriptorRegistryEntry> = {
	population: {
		resolve: (id) => {
			const role = id
				? POPULATION_ROLES[id as keyof typeof POPULATION_ROLES]
				: undefined;
			return {
				icon: role?.icon ?? '',
				label: role?.label ?? id ?? 'Population',
			};
		},
		formatDetail: defaultFormatDetail,
		augmentDependencyDetail: (detail, dep, player, _ctx, options) => {
			const includeCounts = options.includeCounts ?? true;
			if (!includeCounts || !dep.id) return detail;
			const count = player.population?.[dep.id] ?? 0;
			if (count > 0) return detail ? `${detail} ×${count}` : `×${count}`;
			return detail;
		},
	},
	building: {
		resolve: (id) => {
			if (id && BUILDINGS.has(id)) {
				const building = BUILDINGS.get(id);
				return { icon: building.icon ?? '', label: building.name ?? id };
			}
			return { icon: '', label: id ?? 'Building' };
		},
		formatDetail: defaultFormatDetail,
	},
	development: {
		resolve: (id) => {
			if (id && DEVELOPMENTS.has(id)) {
				const development = DEVELOPMENTS.get(id);
				return { icon: development.icon ?? '', label: development.name ?? id };
			}
			return { icon: '', label: id ?? 'Development' };
		},
		formatDetail: defaultFormatDetail,
	},
	phase: (() => {
		const resolvePhase: DescriptorRegistryEntry['resolve'] = (id) => {
			const phase = id ? PHASES.find((p) => p.id === id) : undefined;
			return { icon: phase?.icon ?? '', label: phase?.label ?? id ?? 'Phase' };
		};
		return {
			resolve: resolvePhase,
			formatDetail: (id, detail) => formatStepLabel(id, detail),
			formatDependency: (dep) => {
				const label = formatPhaseStep(dep.id, dep.detail);
				if (label) return label.trim();
				const base = resolvePhase(dep.id);
				return base.label.trim();
			},
		} satisfies DescriptorRegistryEntry;
	})(),
	action: {
		resolve: (id) => {
			if (id && ACTIONS.has(id)) {
				const action = ACTIONS.get(id);
				return { icon: action.icon ?? '', label: action.name ?? id };
			}
			return { icon: '', label: id ?? 'Action' };
		},
		formatDetail: defaultFormatDetail,
	},
	stat: {
		resolve: (id) => {
			if (id) {
				const statInfo = STATS[id as keyof typeof STATS];
				return { icon: statInfo?.icon ?? '', label: statInfo?.label ?? id };
			}
			return { icon: '', label: 'Stat' };
		},
		formatDetail: defaultFormatDetail,
		augmentDependencyDetail: (detail, dep, player, ctx) => {
			if (!dep.id) return detail;
			const statValue =
				player.stats?.[dep.id] ?? ctx.activePlayer.stats?.[dep.id] ?? 0;
			const valueStr = formatStatValue(dep.id, statValue);
			return detail ? `${detail} ${valueStr}` : valueStr;
		},
	},
	resource: {
		resolve: (id) => {
			if (id) {
				const resource = RESOURCES[id as keyof typeof RESOURCES];
				return { icon: resource?.icon ?? '', label: resource?.label ?? id };
			}
			return { icon: '', label: 'Resource' };
		},
		formatDetail: defaultFormatDetail,
	},
	trigger: {
		resolve: (id) => {
			if (id) {
				const info = TRIGGER_LOOKUP[id];
				if (info) {
					return {
						icon: info.icon ?? '',
						label: info.past ?? info.future ?? id,
					};
				}
			}
			return { icon: '', label: id ?? 'Trigger' };
		},
		formatDetail: defaultFormatDetail,
	},
	passive: {
		resolve: () => ({
			icon: PASSIVE_INFO.icon ?? '',
			label: PASSIVE_INFO.label ?? 'Passive',
		}),
		formatDetail: defaultFormatDetail,
	},
	land: {
		resolve: (id) => ({ icon: '', label: id ?? 'Land' }),
		formatDetail: defaultFormatDetail,
	},
	start: {
		resolve: () => ({ icon: '', label: 'Initial setup' }),
		formatDetail: defaultFormatDetail,
	},
};

function createDefaultDescriptor(kind?: string): DescriptorRegistryEntry {
	return {
		resolve: defaultResolve(kind ?? 'Source'),
		formatDetail: defaultFormatDetail,
	};
}

function getDescriptor(kind?: string): DescriptorRegistryEntry {
	if (!kind) return createDefaultDescriptor();
	return DESCRIPTOR_REGISTRY[kind] ?? createDefaultDescriptor(kind);
}

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

function getSourceDescriptor(meta: StatSourceMeta): SourceDescriptor {
	const descriptorEntry = getDescriptor(meta.kind);
	const base = descriptorEntry.resolve(meta.id);
	const descriptor: SourceDescriptor = {
		icon: base.icon,
		label: base.label,
	};
	let suffix = descriptorEntry.formatDetail?.(meta.id, meta.detail);
	if (suffix === undefined && meta.detail)
		suffix = defaultFormatDetail(meta.id, meta.detail);
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
	const descriptor = getDescriptor(dep.type);
	if (descriptor.formatDependency)
		return descriptor.formatDependency(dep, player, ctx, options);
	const entity = descriptor.resolve(dep.id);
	const fragments: string[] = [];
	if (entity.icon) fragments.push(entity.icon);
	if (entity.label) fragments.push(entity.label);
	let detail = descriptor.formatDetail?.(dep.id, dep.detail);
	if (detail === undefined && dep.detail)
		detail = defaultFormatDetail(dep.id, dep.detail);
	const augmented = descriptor.augmentDependencyDetail?.(
		detail,
		dep,
		player,
		ctx,
		options,
	);
	if (augmented !== undefined) detail = augmented;
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
