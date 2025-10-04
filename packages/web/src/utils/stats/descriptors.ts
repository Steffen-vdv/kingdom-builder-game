/* eslint-disable max-lines */
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
	StatSourceLink,
	StatSourceMeta,
} from '@kingdom-builder/engine';

type ResolveResult = { icon: string; label: string };

type TriggerInfoRecord = Record<
	string,
	{ icon?: string; future?: string; past?: string }
>;

export type SourceDescriptor = ResolveResult & {
	suffix?: ResolveResult;
	kind?: string;
};

export type DescriptorRegistryEntry = {
	resolve(id?: string): ResolveResult;
	formatDetail?: (
		id: string | undefined,
		detail: string | undefined,
	) => string | undefined;
	augmentDependencyDetail?: (
		detail: string | undefined,
		link: StatSourceLink,
		player: EngineContext['activePlayer'],
		context: EngineContext,
		options: { includeCounts?: boolean },
	) => string | undefined;
	formatDependency?: (
		link: StatSourceLink,
		player: EngineContext['activePlayer'],
		context: EngineContext,
		options: { includeCounts?: boolean },
	) => string;
};

export function statDisplaysAsPercent(key: string): boolean {
	const info = STATS[key as keyof typeof STATS];
	return Boolean(info?.displayAsPercent ?? info?.addFormat?.percent);
}

export function formatStatValue(key: string, value: number): string {
	return statDisplaysAsPercent(key) ? `${value * 100}%` : String(value);
}

const TRIGGER_LOOKUP = TRIGGER_INFO as TriggerInfoRecord;

const defaultFormatDetail: NonNullable<
	DescriptorRegistryEntry['formatDetail']
> = (_id, detail) => {
	if (!detail) {
		return undefined;
	}
	return formatDetailText(detail);
};

function createRegistryResolver(
	registry: {
		has(id: string): boolean;
		get(id: string): { icon?: unknown; name?: unknown } | undefined;
	},
	fallback: string,
	nameKey: 'name' | 'label' = 'name',
): DescriptorRegistryEntry['resolve'] {
	return (id) => {
		if (id && registry.has(id)) {
			const item = registry.get(id);
			if (item) {
				const record = item as Record<string, string | undefined>;
				const label = record[nameKey];
				return { icon: record.icon ?? '', label: label ?? id };
			}
		}
		return { icon: '', label: id ?? fallback };
	};
}

function createRecordResolver<T extends { icon?: string; label?: string }>(
	record: Record<string, T>,
	fallback: string,
): DescriptorRegistryEntry['resolve'] {
	return (id) => {
		if (id) {
			const item = record[id];
			if (item) {
				return {
					icon: item.icon ?? '',
					label: item.label ?? id,
				};
			}
		}
		return { icon: '', label: id ?? fallback };
	};
}

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
		augmentDependencyDetail: (detail, link, player, _context, options) => {
			const includeCounts = options.includeCounts ?? true;
			if (!includeCounts || !link.id) {
				return detail;
			}
			const count = player.population?.[link.id] ?? 0;
			if (count > 0) {
				return detail ? `${detail} ×${count}` : `×${count}`;
			}
			return detail;
		},
	},
	building: {
		resolve: createRegistryResolver(BUILDINGS, 'Building'),
		formatDetail: defaultFormatDetail,
	},
	development: {
		resolve: createRegistryResolver(DEVELOPMENTS, 'Development'),
		formatDetail: defaultFormatDetail,
	},
	action: {
		resolve: createRegistryResolver(ACTIONS, 'Action'),
		formatDetail: defaultFormatDetail,
	},
	phase: (() => {
		const resolvePhase: DescriptorRegistryEntry['resolve'] = (id) => {
			const phase = id
				? PHASES.find((phaseItem) => phaseItem.id === id)
				: undefined;
			return {
				icon: phase?.icon ?? '',
				label: phase?.label ?? id ?? 'Phase',
			};
		};
		return {
			resolve: resolvePhase,
			// prettier-ignore
			formatDetail: (id, detail) =>
				formatStepLabel(id, detail),
			formatDependency: (link) => {
				const label = formatPhaseStep(link.id, link.detail);
				if (label) {
					return label.trim();
				}
				const base = resolvePhase(link.id);
				return base.label.trim();
			},
		} satisfies DescriptorRegistryEntry;
	})(),
	stat: {
		// prettier-ignore
		resolve: createRecordResolver(
			STATS,
			'Stat',
		),
		formatDetail: defaultFormatDetail,
		// prettier-ignore
		augmentDependencyDetail: (
			detail,
			link,
			player,
			context,
		) => {
			if (!link.id) {
				return detail;
			}
			const statValue =
				player.stats?.[link.id] ??
				context.activePlayer.stats?.[link.id] ??
				0;
			const valueText = formatStatValue(link.id, statValue);
			return detail ? `${detail} ${valueText}` : valueText;
		},
	},
	resource: {
		resolve: createRecordResolver(RESOURCES, 'Resource'),
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
		resolve: () => ({ icon: '', label: 'Initial Setup' }),
		formatDetail: defaultFormatDetail,
	},
};

function createDefaultDescriptor(kind?: string): DescriptorRegistryEntry {
	return {
		resolve: (id) => ({ icon: '', label: id ?? kind ?? 'Source' }),
		formatDetail: defaultFormatDetail,
	};
}

export function getDescriptor(kind?: string): DescriptorRegistryEntry {
	if (!kind) {
		return createDefaultDescriptor();
	}
	return DESCRIPTOR_REGISTRY[kind] ?? createDefaultDescriptor(kind);
}

function formatKindLabel(kind?: string, id?: string): string | undefined {
	if (!kind) {
		return undefined;
	}
	const descriptor = getDescriptor(kind);
	const resolved = descriptor.resolve(id);
	const parts: string[] = [];
	if (resolved.icon) {
		parts.push(resolved.icon);
	}
	if (resolved.label) {
		parts.push(resolved.label);
	}
	const label = parts.join(' ').trim();
	return label || undefined;
}

export function formatLinkLabel(link?: StatSourceLink): string | undefined {
	if (!link) {
		return undefined;
	}
	const descriptor = getDescriptor(link.type);
	const resolved = descriptor.resolve(link.id);
	const parts: string[] = [];
	if (resolved.icon) {
		parts.push(resolved.icon);
	}
	if (resolved.label) {
		parts.push(resolved.label);
	}
	const label = parts.join(' ').trim();
	return label || undefined;
}

function resolveLinkDescriptor(
	link?: StatSourceLink,
	options: {
		omitAssignmentDetail?: boolean;
		omitRemovalDetail?: boolean;
	} = {},
): ResolveResult | undefined {
	if (!link?.type) {
		return undefined;
	}
	const descriptor = getDescriptor(link.type);
	const resolved = descriptor.resolve(link.id);
	let label = resolved.label;
	let detail = descriptor.formatDetail?.(link.id, link.detail);
	if (detail === undefined && link?.detail) {
		detail = defaultFormatDetail(link.id, link.detail);
	}
	if (detail) {
		const normalized = detail.trim().toLowerCase();
		if (options.omitAssignmentDetail) {
			if (normalized === 'assigned' || normalized === 'unassigned') {
				detail = undefined;
			}
		}
		if (options.omitRemovalDetail && normalized === 'removed') {
			detail = undefined;
		}
	}
	if (detail) {
		label = label ? `${label} ${detail}`.trim() : detail;
	}
	if (!label && !resolved.icon) {
		return undefined;
	}
	return {
		icon: resolved.icon,
		label: label ?? '',
	} satisfies ResolveResult;
}

function deriveResolutionSuffix(
	meta: StatSourceMeta,
): ResolveResult | undefined {
	if (meta.kind !== 'action') {
		return undefined;
	}
	const detail = meta.detail?.trim().toLowerCase();
	if (detail !== 'resolution') {
		return undefined;
	}
	const candidates: (StatSourceLink | undefined)[] = [meta.removal];
	if (meta.dependsOn) {
		candidates.push(...meta.dependsOn);
	}
	const priority = ['development', 'building', 'population', 'passive', 'land'];
	for (const type of priority) {
		const match = candidates.find((link) => link?.type === type);
		if (!match) {
			continue;
		}
		const resolved = resolveLinkDescriptor(match, {
			omitAssignmentDetail: true,
			omitRemovalDetail: true,
		});
		if (resolved) {
			return resolved;
		}
	}
	if (meta.removal) {
		const fallback = resolveLinkDescriptor(meta.removal, {
			omitAssignmentDetail: true,
			omitRemovalDetail: true,
		});
		if (fallback) {
			return fallback;
		}
	}
	return undefined;
}

export function getSourceDescriptor(meta: StatSourceMeta): SourceDescriptor {
	const entry = getDescriptor(meta.kind);
	const base = entry.resolve(meta.id);
	const descriptor: SourceDescriptor = {
		icon: base.icon,
		label: base.label,
	};
	if (meta.kind) {
		descriptor.kind = meta.kind;
	}
	let suffixText = entry.formatDetail?.(meta.id, meta.detail);
	if (suffixText === undefined && meta.detail) {
		suffixText = defaultFormatDetail(meta.id, meta.detail);
	}
	let suffix = suffixText
		? ({ icon: '', label: suffixText } satisfies ResolveResult)
		: undefined;
	const resolutionSuffix = deriveResolutionSuffix(meta);
	if (resolutionSuffix) {
		suffix = resolutionSuffix;
	}
	const isAction = meta.kind === 'action';
	const noResolutionOverride = resolutionSuffix === undefined;
	if (suffix != null && noResolutionOverride && isAction) {
		const detail = suffix.label.trim().toLowerCase();
		if (detail === 'resolution') {
			suffix = undefined;
		}
	}
	if (suffix) {
		descriptor.suffix = suffix;
	}
	if (!descriptor.label) {
		const fallbackLabel = formatKindLabel(meta.kind, meta.id);
		if (fallbackLabel) {
			descriptor.label = fallbackLabel;
		}
	}
	return descriptor;
}

export function formatSourceTitle(descriptor: SourceDescriptor): string {
	const iconParts: string[] = [];
	const pushIcon = (icon?: string) => {
		if (!icon) {
			return;
		}
		if (!iconParts.includes(icon)) {
			iconParts.push(icon);
		}
	};
	pushIcon(descriptor.icon);
	pushIcon(descriptor.suffix?.icon);
	const iconText = iconParts.join('');
	const baseLabel = descriptor.label?.trim() ?? '';
	const suffixLabel = descriptor.suffix?.label?.trim() ?? '';
	let labelText = baseLabel;
	if (descriptor.kind === 'action') {
		if (baseLabel && suffixLabel) {
			labelText = `${baseLabel}: ${suffixLabel}`;
		} else if (suffixLabel) {
			labelText = suffixLabel;
		}
	} else if (suffixLabel) {
		const normalizedBase = baseLabel.toLowerCase();
		const normalizedSuffix = suffixLabel.toLowerCase();
		if (baseLabel && normalizedBase !== normalizedSuffix) {
			labelText = `${baseLabel} · ${suffixLabel}`;
		} else {
			labelText = suffixLabel || baseLabel;
		}
	}
	const parts: string[] = [];
	if (iconText) {
		parts.push(iconText);
	}
	if (labelText) {
		parts.push(labelText);
	}
	return parts.join(' ').trim();
}

export function formatDependency(
	link: StatSourceLink,
	player: EngineContext['activePlayer'],
	context: EngineContext,
	options: { includeCounts?: boolean } = {},
): string {
	const entry = getDescriptor(link.type);
	if (entry.formatDependency) {
		return entry.formatDependency(link, player, context, options);
	}
	const entity = entry.resolve(link.id);
	const fragments: string[] = [];
	if (entity.icon) {
		fragments.push(entity.icon);
	}
	if (entity.label) {
		fragments.push(entity.label);
	}
	let detail = entry.formatDetail?.(link.id, link.detail);
	if (detail === undefined && link.detail) {
		detail = defaultFormatDetail(link.id, link.detail);
	}
	const augmented = entry.augmentDependencyDetail?.(
		detail,
		link,
		player,
		context,
		options,
	);
	if (augmented !== undefined) {
		detail = augmented;
	}
	if (detail) {
		fragments.push(detail);
	}
	return fragments.join(' ').replace(/\s+/g, ' ').trim();
}

export function formatTriggerLabel(id: string): string | undefined {
	if (!id) {
		return undefined;
	}
	const info = TRIGGER_LOOKUP[id];
	if (info) {
		const parts: string[] = [];
		if (info.icon) {
			parts.push(info.icon);
		}
		const label = info.past ?? info.future ?? id;
		if (label) {
			parts.push(label);
		}
		return parts.join(' ').trim();
	}
	return id;
}

export function formatPhaseStep(
	phaseId?: string,
	stepId?: string,
): string | undefined {
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
		? PHASES.find((phaseItem) => phaseItem.id === phaseId)
		: undefined;
	const step = phase?.steps.find((stepItem) => stepItem.id === stepId);
	if (!step) {
		return formatDetailText(stepId);
	}
	const parts: string[] = [];
	if (phase?.icon) {
		parts.push(phase.icon);
	}
	if (phase?.label) {
		parts.push(phase.label);
	}
	const stepText = formatStepLabel(phaseId, stepId);
	if (parts.length && stepText) {
		return `${parts.join(' ').trim()} · ${stepText}`;
	}
	return stepText;
}

export function formatStepLabel(
	phaseId?: string,
	stepId?: string,
): string | undefined {
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
		? PHASES.find((phaseItem) => phaseItem.id === phaseId)
		: undefined;
	const step = phase?.steps.find((stepItem) => stepItem.id === stepId);
	if (!step) {
		return formatDetailText(stepId);
	}
	const parts: string[] = [];
	if (step.icon) {
		parts.push(step.icon);
	}
	const label = step.title ?? step.id;
	if (label) {
		parts.push(label);
	}
	return parts.join(' ').trim();
}

export function formatDetailText(detail: string): string {
	if (!detail) {
		return '';
	}
	if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(detail)) {
		return detail
			.split('-')
			.filter((segment) => segment.length)
			.map((segment) => {
				return segment.charAt(0).toUpperCase() + segment.slice(1);
			})
			.join(' ');
	}
	if (/^[a-z]/.test(detail)) {
		return detail.charAt(0).toUpperCase() + detail.slice(1);
	}
	return detail;
}
