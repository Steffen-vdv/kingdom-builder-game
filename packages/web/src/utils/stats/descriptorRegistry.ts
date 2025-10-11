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

function resolveFromAssets(
        assets: Readonly<Record<string, { icon?: string; label?: string }>>,
        fallback: Readonly<{ icon?: string; label?: string }> | undefined,
        defaultLabel: string,
        id?: string,
): ResolveResult {
        const normalizedId = typeof id === 'string' ? id : undefined;
        const entry = normalizedId ? assets[normalizedId] : undefined;
        const icon = entry?.icon ?? fallback?.icon ?? '';
        const label =
                entry?.label ?? fallback?.label ?? normalizedId ?? defaultLabel;
        return { icon: icon ?? '', label } satisfies ResolveResult;
}

function resolveFromFallback(
        fallback: Readonly<{ icon?: string; label?: string }> | undefined,
        defaultLabel: string,
        id?: string,
): ResolveResult {
        const icon = fallback?.icon ?? '';
        const label = fallback?.label ?? id ?? defaultLabel;
        return { icon, label } satisfies ResolveResult;
}

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

function createDescriptorRegistry(
        translationContext: TranslationContext,
): Registry {
        const phases = translationContext.phases;
        const assets = translationContext.assets;
        return {
                population: {
                        resolve: (id) => {
                                return resolveFromAssets(
                                        assets.populations,
                                        assets.population,
                                        'Population',
                                        id,
                                );
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
                                        ? phases.find((phaseItem) => {
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
                                formatDetail: (id, detail) =>
                                        formatStepLabel(phases, id, detail),
                                formatDependency: (link) => {
                                        const label = formatPhaseStep(
                                                phases,
                                                link.id,
                                                link.detail,
                                        );
                                        if (label) {
                                                return label.trim();
                                        }
                                        const base = resolvePhase(link.id);
					return base.label.trim();
				},
			} satisfies DescriptorRegistryEntry;
		})(),
                stat: {
                        resolve: (id) =>
                                resolveFromAssets(
                                        assets.stats,
                                        undefined,
                                        'Stat',
                                        id,
                                ),
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
                        resolve: (id) =>
                                resolveFromAssets(
                                        assets.resources,
                                        undefined,
                                        'Resource',
                                        id,
                                ),
                        formatDetail: defaultFormatDetail,
                },
                trigger: createTriggerDescriptorEntry(
                        assets,
                        defaultFormatDetail,
                ),
                passive: {
                        resolve: (id) =>
                                resolveFromFallback(
                                        assets.passive,
                                        'Passive',
                                        id,
                                ),
                        formatDetail: defaultFormatDetail,
                },
                land: {
                        resolve: (id) =>
                                resolveFromFallback(
                                        assets.land,
                                        'Land',
                                        id,
                                ),
                        formatDetail: defaultFormatDetail,
                },
                start: {
                        resolve: (id) =>
                                resolveFromFallback(
                                        undefined,
                                        'Initial Setup',
                                        id,
                                ),
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
