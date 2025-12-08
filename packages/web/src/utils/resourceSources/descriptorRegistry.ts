import type {
	TranslationContext,
	TranslationRegistry,
} from '../../translation/context';
import { formatDetailText, formatPhaseStep, formatStepLabel } from './format';
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

function createDescriptorRegistry(
	translationContext: TranslationContext,
): Registry {
	return {
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
					icon: phase?.icon ?? '⚠️',
					label: phase?.label ?? `[MISSING:phase:${id}]`,
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
		resource: {
			resolve: (id) => {
				if (id && translationContext.resourceMetadata.has(id)) {
					const metadata = translationContext.resourceMetadata.get(id);
					return {
						icon: metadata.icon ?? '⚠️',
						label: metadata.label ?? `[MISSING:resource:${id}]`,
					} satisfies ResolveResult;
				}
				return {
					icon: '⚠️',
					label: `[MISSING:resource:${id ?? 'unknown'}]`,
				} satisfies ResolveResult;
			},
			formatDetail: defaultFormatDetail,
			augmentDependencyDetail: (detail, link, player, _context, options) => {
				const includeCounts = options.includeCounts ?? true;
				if (!includeCounts || !link.id) {
					return detail;
				}
				const resourceValue = player.values?.[link.id];
				if (resourceValue === undefined || resourceValue === 0) {
					return detail;
				}
				const metadata = translationContext.resourceMetadata.has(link.id)
					? translationContext.resourceMetadata.get(link.id)
					: undefined;
				const isPercent = metadata?.displayAsPercent ?? false;
				const valueText = isPercent
					? `${Math.round(resourceValue * 100)}%`
					: String(resourceValue);
				return detail ? `${detail} ${valueText}` : valueText;
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
					icon: passive.icon ?? '⚠️',
					label: passive.label ?? '[MISSING:passive]',
				} satisfies ResolveResult;
			},
			formatDetail: defaultFormatDetail,
		},
		land: {
			resolve: (id) => {
				const land = translationContext.assets.land;
				return {
					icon: land?.icon ?? '⚠️',
					label: land?.label ?? `[MISSING:land:${id ?? 'unknown'}]`,
				};
			},
			formatDetail: defaultFormatDetail,
		},
		start: {
			resolve: () => {
				// No start asset in TranslationAssets - use visible placeholder
				return {
					icon: '⚠️',
					label: '[MISSING:start]',
				};
			},
			formatDetail: defaultFormatDetail,
		},
	} satisfies Registry;
}

function createDefaultDescriptor(kind?: string): DescriptorRegistryEntry {
	return {
		resolve: (id) => ({
			icon: '⚠️',
			label: `[MISSING:${kind ?? 'source'}:${id ?? 'unknown'}]`,
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
