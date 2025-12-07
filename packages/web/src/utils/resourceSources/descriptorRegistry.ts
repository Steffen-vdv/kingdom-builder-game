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
		resource: {
			resolve: (id) => {
				if (id && translationContext.resourceMetadataV2.has(id)) {
					const metadata = translationContext.resourceMetadataV2.get(id);
					return {
						icon: metadata.icon ?? '',
						label: metadata.label ?? id,
					} satisfies ResolveResult;
				}
				return {
					icon: '',
					label: id ?? 'Resource',
				} satisfies ResolveResult;
			},
			formatDetail: defaultFormatDetail,
			augmentDependencyDetail: (detail, link, player, _context, options) => {
				const includeCounts = options.includeCounts ?? true;
				if (!includeCounts || !link.id) {
					return detail;
				}
				const resourceValue = player.valuesV2?.[link.id];
				if (resourceValue === undefined || resourceValue === 0) {
					return detail;
				}
				const metadata = translationContext.resourceMetadataV2.has(link.id)
					? translationContext.resourceMetadataV2.get(link.id)
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
