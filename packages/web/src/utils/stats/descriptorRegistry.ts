import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	PASSIVE_INFO,
	PHASES,
	POPULATION_ROLES,
	RESOURCES,
	STATS,
} from '@kingdom-builder/contents';
import {
	formatDetailText,
	formatPhaseStep,
	formatStatValue,
	formatStepLabel,
} from './format';
import { createTriggerDescriptorEntry } from './triggerLabels';
import type { DescriptorRegistryEntry, ResolveResult } from './types';

type RegistryResolver = DescriptorRegistryEntry['resolve'];

type Registry = Record<string, DescriptorRegistryEntry>;

export const defaultFormatDetail: NonNullable<
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
): RegistryResolver {
	return (id) => {
		if (id && registry.has(id)) {
			const item = registry.get(id);
			if (item) {
				const record = item as Record<string, string | undefined>;
				const label = record[nameKey];
				return {
					icon: record.icon ?? '',
					label: label ?? id,
				} satisfies ResolveResult;
			}
		}
		return {
			icon: '',
			label: id ?? fallback,
		} satisfies ResolveResult;
	};
}

function createRecordResolver<T extends { icon?: string; label?: string }>(
	record: Record<string, T>,
	fallback: string,
): RegistryResolver {
	return (id) => {
		if (id) {
			const item = record[id];
			if (item) {
				return {
					icon: item.icon ?? '',
					label: item.label ?? id,
				} satisfies ResolveResult;
			}
		}
		return {
			icon: '',
			label: id ?? fallback,
		} satisfies ResolveResult;
	};
}

const DESCRIPTOR_REGISTRY: Registry = {
	population: {
		resolve: (id) => {
			const role = id
				? POPULATION_ROLES[id as keyof typeof POPULATION_ROLES]
				: undefined;
			return {
				icon: role?.icon ?? '',
				label: role?.label ?? id ?? 'Population',
			} satisfies ResolveResult;
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
		const resolvePhase: RegistryResolver = (id) => {
			const phase = id
				? PHASES.find((phaseItem) => {
						return phaseItem.id === id;
					})
				: undefined;
			return {
				icon: phase?.icon ?? '',
				label: phase?.label ?? id ?? 'Phase',
			} satisfies ResolveResult;
		};
		return {
			resolve: resolvePhase,
			formatDetail: (id, detail) => formatStepLabel(id, detail),
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
		resolve: createRecordResolver(STATS, 'Stat'),
		formatDetail: defaultFormatDetail,
		augmentDependencyDetail: (detail, link, player, context) => {
			if (!link.id) {
				return detail;
			}
			const statValue =
				player.stats?.[link.id] ?? context.activePlayer.stats?.[link.id] ?? 0;
			const valueText = formatStatValue(link.id, statValue);
			return detail ? `${detail} ${valueText}` : valueText;
		},
	},
	resource: {
		resolve: createRecordResolver(RESOURCES, 'Resource'),
		formatDetail: defaultFormatDetail,
	},
	trigger: createTriggerDescriptorEntry(defaultFormatDetail),
	passive: {
		resolve: () => ({
			icon: PASSIVE_INFO.icon ?? '',
			label: PASSIVE_INFO.label ?? 'Passive',
		}),
		formatDetail: defaultFormatDetail,
	},
	land: {
		resolve: (id) => ({
			icon: '',
			label: id ?? 'Land',
		}),
		formatDetail: defaultFormatDetail,
	},
	start: {
		resolve: () => ({
			icon: '',
			label: 'Initial Setup',
		}),
		formatDetail: defaultFormatDetail,
	},
};

function createDefaultDescriptor(kind?: string): DescriptorRegistryEntry {
	return {
		resolve: (id) => ({
			icon: '',
			label: id ?? kind ?? 'Source',
		}),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function getDescriptor(kind?: string): DescriptorRegistryEntry {
	if (!kind) {
		return createDefaultDescriptor();
	}
	return DESCRIPTOR_REGISTRY[kind] ?? createDefaultDescriptor(kind);
}

export function formatKindLabel(
	kind?: string,
	id?: string,
): string | undefined {
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
