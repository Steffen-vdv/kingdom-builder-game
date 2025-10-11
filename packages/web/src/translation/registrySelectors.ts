import type { BuildingConfig } from '@kingdom-builder/protocol';
import type { TranslationContext } from './context';

export type RegistryIconLabel = {
icon: string;
label: string;
};

const EMPTY_ICON = '';

const DEFAULT_LABEL = 'Unknown';

const CAMEL_BOUNDARY = /([a-z])([A-Z])/g;

const NON_WORD_SEPARATORS = /[:/_-]+/g;

function normalizeIdentifier(id: string): string {
if (!id) {
return DEFAULT_LABEL;
}
const spaced = id
.replace(NON_WORD_SEPARATORS, ' ')
.replace(CAMEL_BOUNDARY, '$1 $2')
.trim();
if (!spaced) {
return id;
}
return spaced
.split(/\s+/)
.map((segment) => {
const [first, ...rest] = segment;
if (!first) {
return '';
}
return `${first.toUpperCase()}${rest.join('').toLowerCase()}`;
})
.filter((segment) => segment.length > 0)
.join(' ');
}

function buildIconLabel(
icon: string | undefined,
label: string | undefined,
fallbackId: string,
): RegistryIconLabel {
return {
icon: icon ?? EMPTY_ICON,
label: label ?? normalizeIdentifier(fallbackId),
};
}

export function selectResourceIconLabel(
context: Pick<TranslationContext, 'assets'>,
resourceKey: string,
): RegistryIconLabel {
const descriptor = context.assets.resources[resourceKey];
return buildIconLabel(descriptor?.icon, descriptor?.label, resourceKey);
}

export function selectStatIconLabel(
context: Pick<TranslationContext, 'assets'>,
statKey: string,
options: { fallbackLabel?: string } = {},
): RegistryIconLabel {
const descriptor = context.assets.stats[statKey];
const fallback = options.fallbackLabel ?? statKey;
return buildIconLabel(descriptor?.icon, descriptor?.label, fallback);
}

export function selectBuildingIconLabel(
context: Pick<TranslationContext, 'buildings'>,
buildingId: string,
): RegistryIconLabel {
if (context.buildings.has(buildingId)) {
try {
const definition = context.buildings.get(buildingId) as BuildingConfig;
return buildIconLabel(
definition.icon,
definition.name ?? (definition as { label?: string }).label,
buildingId,
);
} catch {
// fall through to default label below
}
}
return {
icon: EMPTY_ICON,
label: normalizeIdentifier(buildingId),
};
}

export function selectIconLabel(
context: TranslationContext,
key: string,
): RegistryIconLabel {
if (context.assets.resources[key]) {
return selectResourceIconLabel(context, key);
}
if (context.assets.stats[key]) {
return selectStatIconLabel(context, key);
}
return {
icon: EMPTY_ICON,
label: normalizeIdentifier(key),
};
}

export { normalizeIdentifier };
