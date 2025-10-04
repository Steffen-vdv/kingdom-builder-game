/* eslint-disable max-lines, max-len */

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

export type SourceDescriptor = {
	icon: string;
	label: string;
	suffix?: string;
};

export function statDisplaysAsPercent(key: string): boolean {
	const info = STATS[key as keyof typeof STATS];
	return Boolean(info?.displayAsPercent ?? info?.addFormat?.percent);
}

export function formatStatValue(key: string, value: number): string {
	return statDisplaysAsPercent(key) ? `${value * 100}%` : String(value);
}

const TRIGGER_LOOKUP = TRIGGER_INFO as Record<
	string,
	{ icon?: string; future?: string; past?: string }
>;

export function formatDetailText(detail: string): string {
	if (!detail) {
		return '';
	}
	if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(detail)) {
		return detail
			.split('-')
			.filter((segment) => segment.length)
			.map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
			.join(' ');
	}
	if (/^[a-z]/.test(detail)) {
		return detail.charAt(0).toUpperCase() + detail.slice(1);
	}
	return detail;
}

const defaultFormatDetail: DescriptorDetailFormatter = (_id, detail) =>
	detail ? formatDetailText(detail) : undefined;

const defaultResolve =
	(labelFallback: string): DescriptorRegistryEntry['resolve'] =>
	(id) => ({
		icon: '',
		label: id ?? labelFallback,
	});

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
	dependency: StatSourceLink,
	player: EngineContext['activePlayer'],
	context: EngineContext,
	options: { includeCounts?: boolean },
) => string | undefined;

type DescriptorDependencyFormatter = (
	dependency: StatSourceLink,
	player: EngineContext['activePlayer'],
	context: EngineContext,
	options: { includeCounts?: boolean },
) => string;

type DescriptorRegistryEntry = {
	resolve(id?: string): EntityDescriptor;
	formatDetail?: DescriptorDetailFormatter;
	augmentDependencyDetail?: DescriptorDependencyAugmenter;
	formatDependency?: DescriptorDependencyFormatter;
};

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
		augmentDependencyDetail: (
			detail,
			dependency,
			player,
			_context,
			options,
		) => {
			const includeCounts = options.includeCounts ?? true;
			if (!includeCounts || !dependency.id) {
				return detail;
			}
			const count = player.population?.[dependency.id] ?? 0;
			if (count > 0) {
				return detail ? `${detail} ×${count}` : `×${count}`;
			}
			return detail;
		},
	},
	building: {
		resolve: (id) => {
			if (id && BUILDINGS.has(id)) {
				const building = BUILDINGS.get(id);
				return {
					icon: building.icon ?? '',
					label: building.name ?? id,
				};
			}
			return { icon: '', label: id ?? 'Building' };
		},
		formatDetail: defaultFormatDetail,
	},
	development: {
		resolve: (id) => {
			if (id && DEVELOPMENTS.has(id)) {
				const development = DEVELOPMENTS.get(id);
				return {
					icon: development.icon ?? '',
					label: development.name ?? id,
				};
			}
			return { icon: '', label: id ?? 'Development' };
		},
		formatDetail: defaultFormatDetail,
	},
	phase: (() => {
		const resolvePhase: DescriptorRegistryEntry['resolve'] = (id) => {
			const phase = id ? PHASES.find((entry) => entry.id === id) : undefined;
			return {
				icon: phase?.icon ?? '',
				label: phase?.label ?? id ?? 'Phase',
			};
		};
		return {
			resolve: resolvePhase,
			formatDetail: (id, detail) => formatStepLabel(id, detail),
			formatDependency: (dependency) => {
				const label = formatPhaseStep(dependency.id, dependency.detail);
				if (label) {
					return label.trim();
				}
				const base = resolvePhase(dependency.id);
				return base.label.trim();
			},
		} satisfies DescriptorRegistryEntry;
	})(),
	action: {
		resolve: (id) => {
			if (id && ACTIONS.has(id)) {
				const action = ACTIONS.get(id);
				return {
					icon: action.icon ?? '',
					label: action.name ?? id,
				};
			}
			return { icon: '', label: id ?? 'Action' };
		},
		formatDetail: defaultFormatDetail,
	},
	stat: {
		resolve: (id) => {
			if (id) {
				const statInfo = STATS[id as keyof typeof STATS];
				return {
					icon: statInfo?.icon ?? '',
					label: statInfo?.label ?? id,
				};
			}
			return { icon: '', label: 'Stat' };
		},
		formatDetail: defaultFormatDetail,
		augmentDependencyDetail: (
			detail,
			dependency,
			player,
			context,
			_options,
		) => {
			if (!dependency.id) {
				return detail;
			}
			const statValue =
				player.stats?.[dependency.id] ??
				context.activePlayer.stats?.[dependency.id] ??
				0;
			const valueText = formatStatValue(dependency.id, statValue);
			return detail ? `${detail} ${valueText}` : valueText;
		},
	},
	resource: {
		resolve: (id) => {
			if (id) {
				const resource = RESOURCES[id as keyof typeof RESOURCES];
				return {
					icon: resource?.icon ?? '',
					label: resource?.label ?? id,
				};
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
	if (!kind) {
		return createDefaultDescriptor();
	}
	return DESCRIPTOR_REGISTRY[kind] ?? createDefaultDescriptor(kind);
}

export function getSourceDescriptor(meta: StatSourceMeta): SourceDescriptor {
	const descriptorEntry = getDescriptor(meta.kind);
	const base = descriptorEntry.resolve(meta.id);
	const descriptor: SourceDescriptor = {
		icon: base.icon,
		label: base.label,
	};
	let suffix = descriptorEntry.formatDetail?.(meta.id, meta.detail);
	if (suffix === undefined && meta.detail) {
		suffix = defaultFormatDetail(meta.id, meta.detail);
	}
	if (suffix) {
		descriptor.suffix = suffix;
	}
	return descriptor;
}

export function formatDependency(
	dependency: StatSourceLink,
	player: EngineContext['activePlayer'],
	context: EngineContext,
	options: { includeCounts?: boolean } = {},
): string {
	const descriptor = getDescriptor(dependency.type);
	if (descriptor.formatDependency) {
		return descriptor.formatDependency(dependency, player, context, options);
	}
	const entity = descriptor.resolve(dependency.id);
	const fragments: string[] = [];
	if (entity.icon) {
		fragments.push(entity.icon);
	}
	if (entity.label) {
		fragments.push(entity.label);
	}
	let detail = descriptor.formatDetail?.(dependency.id, dependency.detail);
	if (detail === undefined && dependency.detail) {
		detail = defaultFormatDetail(dependency.id, dependency.detail);
	}
	const augmented = descriptor.augmentDependencyDetail?.(
		detail,
		dependency,
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
	if (!phaseId) {
		return undefined;
	}
	const phase = PHASES.find((entry) => entry.id === phaseId);
	if (!phase) {
		return undefined;
	}
	const parts: string[] = [];
	if (phase.icon) {
		parts.push(phase.icon);
	}
	if (phase.label) {
		parts.push(phase.label);
	}
	const base = parts.join(' ').trim();
	const stepText = formatStepLabel(phaseId, stepId);
	if (stepText) {
		return base ? `${base} · ${stepText}` : stepText;
	}
	return base || undefined;
}

export function formatStepLabel(
	phaseId?: string,
	stepId?: string,
): string | undefined {
	if (!stepId) {
		return undefined;
	}
	const phase = phaseId
		? PHASES.find((entry) => entry.id === phaseId)
		: undefined;
	const step = phase?.steps.find((entry) => entry.id === stepId);
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
