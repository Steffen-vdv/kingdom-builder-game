import type {
	TranslationContext,
	TranslationRegistry,
} from '../../translation/context';
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

function createTranslationRegistryResolver<
	TDefinition extends {
		icon?: string | undefined;
		name?: string | undefined;
		label?: string | undefined;
	},
>(
	registry: TranslationRegistry<TDefinition>,
	fallback: string,
	nameKey: 'name' | 'label' = 'name',
): RegistryResolver {
	return (id) => {
		if (id && registry.has(id)) {
			const definition = registry.get(id);
			if (definition) {
				const record = definition as Record<string, unknown>;
				const resolvedLabel =
					[record[nameKey], record.name, record.label, id, fallback].find(
						(value): value is string =>
							typeof value === 'string' && value.trim().length > 0,
					) ?? fallback;
				const iconValue = record.icon;
				const resolvedIcon =
					typeof iconValue === 'string' && iconValue.trim().length > 0
						? iconValue
						: '';
				return {
					icon: resolvedIcon,
					label: resolvedLabel,
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
	record: Readonly<Record<string, T>>,
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

function createDescriptorRegistry(
	translationContext: TranslationContext,
): Registry {
	return {
		population: {
			resolve: (id) => {
				const base = translationContext.assets.population;
				const fallbackIcon = base.icon ?? '';
				const fallbackLabel = base.label ?? 'Population';
				const entry = id
					? translationContext.assets.populations[id]
					: undefined;
				return {
					icon: entry?.icon ?? fallbackIcon,
					label: entry?.label ?? id ?? fallbackLabel,
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
			resolve: createTranslationRegistryResolver(
				translationContext.buildings,
				'Building',
			),
			formatDetail: defaultFormatDetail,
		},
		development: {
			resolve: createTranslationRegistryResolver(
				translationContext.developments,
				'Development',
			),
			formatDetail: defaultFormatDetail,
		},
		action: {
			resolve: createTranslationRegistryResolver(
				translationContext.actions,
				'Action',
			),
			formatDetail: defaultFormatDetail,
		},
		phase: (() => {
			const resolvePhase: RegistryResolver = (id) => {
				const phase = id
					? translationContext.phases.find((phaseItem) => {
							return phaseItem.id === id;
						})
					: undefined;
				return {
					icon: phase?.icon ?? '',
					label: phase?.label ?? id ?? 'Phase',
				} satisfies ResolveResult;
			};
			const phases = translationContext.phases;
			return {
				resolve: resolvePhase,
				formatDetail: (id, detail) => formatStepLabel(phases, id, detail),
				formatDependency: (link) => {
					const label = formatPhaseStep(phases, link.id, link.detail);
					if (label) {
						return label.trim();
					}
					const base = resolvePhase(link.id);
					return base.label.trim();
				},
			} satisfies DescriptorRegistryEntry;
		})(),
		stat: {
			resolve: createRecordResolver(translationContext.assets.stats, 'Stat'),
			formatDetail: defaultFormatDetail,
			augmentDependencyDetail: (detail, link, player, context) => {
				if (!link.id) {
					return detail;
				}
				const statValue =
					player.stats?.[link.id] ?? context.activePlayer.stats?.[link.id] ?? 0;
				const valueText = formatStatValue(link.id, statValue, context.assets);
				return detail ? `${detail} ${valueText}` : valueText;
			},
		},
		resource: {
			resolve: (id) => {
				// Use ResourceV2 metadata for V2 resource IDs
				if (id && translationContext.resourceMetadataV2.has(id)) {
					const metadata = translationContext.resourceMetadataV2.get(id);
					return {
						icon: metadata.icon ?? '',
						label: metadata.label ?? id,
					} satisfies ResolveResult;
				}
				// Fall back to legacy assets for old-style keys
				if (id) {
					const legacyEntry = translationContext.assets.resources[id];
					if (legacyEntry) {
						return {
							icon: legacyEntry.icon ?? '',
							label: legacyEntry.label ?? id,
						} satisfies ResolveResult;
					}
				}
				return {
					icon: '',
					label: id ?? 'Resource',
				} satisfies ResolveResult;
			},
			formatDetail: defaultFormatDetail,
			augmentDependencyDetail: (detail, link, player, context, options) => {
				// Show count for population-type resources
				const includeCounts = options.includeCounts ?? true;
				if (!includeCounts || !link.id) {
					return detail;
				}
				// Check if this is a population resource by looking at valuesV2
				const resourceValue = player.valuesV2?.[link.id];
				if (resourceValue !== undefined && resourceValue > 0) {
					// Check if it looks like a population resource (has count semantics)
					const isPopulationResource =
						link.id.includes(':population:') || link.id.includes(':role:');
					if (isPopulationResource) {
						return detail ? `${detail} ×${resourceValue}` : `×${resourceValue}`;
					}
				}
				return detail;
			},
		},
		trigger: createTriggerDescriptorEntry(
			translationContext.assets,
			defaultFormatDetail,
		),
		passive: {
			resolve: () => {
				const passive = translationContext.assets.passive;
				return {
					icon: passive.icon ?? '',
					label: passive.label ?? 'Passive',
				} satisfies ResolveResult;
			},
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
	} satisfies Registry;
}

function createDefaultDescriptor(kind?: string): DescriptorRegistryEntry {
	return {
		resolve: (id) => ({
			icon: '',
			label: id ?? kind ?? 'Source',
		}),
		formatDetail: defaultFormatDetail,
	} satisfies DescriptorRegistryEntry;
}

export function getDescriptor(
	translationContext: TranslationContext,
	kind?: string,
): DescriptorRegistryEntry {
	if (!kind) {
		return createDefaultDescriptor();
	}
	const registry = createDescriptorRegistry(translationContext);
	return registry[kind] ?? createDefaultDescriptor(kind);
}

export function formatKindLabel(
	translationContext: TranslationContext,
	kind?: string,
	id?: string,
): string | undefined {
	if (!kind) {
		return undefined;
	}
	const descriptor = getDescriptor(translationContext, kind);
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
