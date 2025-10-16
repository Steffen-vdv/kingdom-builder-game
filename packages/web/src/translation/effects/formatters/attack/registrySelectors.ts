import type { TranslationAssets, TranslationContext } from '../../../context';
import { humanizeIdentifier } from '../../stringUtils';

export type AttackRegistryDescriptor = { icon: string; label: string };

type AssetsCarrier =
	| Pick<TranslationContext, 'assets'>
	| { assets?: TranslationAssets };

type BuildingCarrier = Pick<TranslationContext, 'buildings'> & AssetsCarrier;

type ResourceCarrier = AssetsCarrier;

type StatCarrier = AssetsCarrier;

/**
 * Produce a trimmed string from the input when it contains non-whitespace characters.
 *
 * @param value - Any value to coerce into a string
 * @returns The trimmed string if `value` is a string with at least one non-whitespace character, `undefined` otherwise
 */
function coerceString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Coerces an unknown value to a usable label string, falling back when necessary.
 *
 * @param value - Value to coerce into a string label; ignored if not a non-empty string after trimming
 * @param fallback - String to return when `value` cannot be coerced
 * @returns The coerced string from `value`, or `fallback` if coercion fails
 */
function coerceLabel(value: unknown, fallback: string): string {
	return coerceString(value) ?? fallback;
}

/**
 * Convert an arbitrary value into an icon string.
 *
 * @param value - The value to coerce; expected to be a string but may be any type.
 * @returns The trimmed string if `value` is a non-empty string, otherwise an empty string.
 */
function coerceIcon(value: unknown): string {
	return coerceString(value) ?? '';
}

/**
 * Extracts the translation assets object from a context carrier, if present.
 *
 * @param context - An object that may contain an `assets` property
 * @returns The `TranslationAssets` object when available, `undefined` otherwise
 */
function readAssets(context: AssetsCarrier): TranslationAssets | undefined {
	return 'assets' in context ? context.assets : undefined;
}

/**
 * Freeze an array of keys and return it as a readonly array.
 *
 * @param keys - Array of key strings (typically string-literal keys) to freeze
 * @returns A frozen readonly array containing the same keys
 */
function freezeKeys<T extends string>(keys: string[]): ReadonlyArray<T> {
	return Object.freeze(keys) as ReadonlyArray<T>;
}

/**
 * Resolve the display label and icon for an attack resource using the provided translation context.
 *
 * @param context - Translation context or carrier that may contain `assets.resources` used to resolve the resource descriptor
 * @param resourceKey - The resource identifier to resolve
 * @returns An AttackRegistryDescriptor with `label` and `icon`; `label` falls back to a humanized `resourceKey` (or the key itself) and `icon` falls back to an empty string
 */
export function selectAttackResourceDescriptor(
	context: ResourceCarrier,
	resourceKey: string,
): AttackRegistryDescriptor {
	const assets = readAssets(context);
	const entry = assets?.resources?.[resourceKey];
	const label = coerceLabel(
		entry?.label,
		humanizeIdentifier(resourceKey) || resourceKey,
	);
	const icon = coerceIcon(entry?.icon);
	return { icon, label };
}

/**
 * Produce an attack stat descriptor (icon and label) for the given stat key using the provided translation context.
 *
 * @param context - Translation context or an object carrying optional `assets` used to resolve localized labels and icons
 * @param statKey - Identifier of the stat to describe
 * @returns An object with `icon` (icon string, empty if none) and `label` (localized label or a humanized fallback of `statKey`)
 */
export function selectAttackStatDescriptor(
	context: StatCarrier,
	statKey: string,
): AttackRegistryDescriptor {
	const assets = readAssets(context);
	const entry = assets?.stats?.[statKey];
	const fallbackLabel = humanizeIdentifier(statKey) || statKey;
	const label = coerceLabel(entry?.label, fallbackLabel);
	const icon = coerceIcon(entry?.icon);
	return { icon, label };
}

/**
 * Create an attack registry descriptor for a building using context-provided metadata.
 *
 * @param context - Carrier providing access to translation assets and building definitions
 * @param buildingId - Identifier used to look up the building definition
 * @returns An `AttackRegistryDescriptor` whose `label` is the building's name when available or `buildingId` as a fallback, and whose `icon` is the building's icon or an empty string
 */
export function selectAttackBuildingDescriptor(
	context: BuildingCarrier,
	buildingId: string,
): AttackRegistryDescriptor {
	const fallback: AttackRegistryDescriptor = {
		icon: '',
		label: buildingId,
	};
	try {
		const definition = context.buildings.get(buildingId);
		const label = coerceLabel(definition?.name, buildingId);
		const icon = coerceIcon(definition?.icon);
		const descriptor: AttackRegistryDescriptor = { icon, label };
		return descriptor;
	} catch {
		return fallback;
	}
}

/**
 * List available attack resource keys from the provided translation context.
 *
 * @param context - Translation context or carrier that may contain `assets.resources`
 * @returns A frozen ReadonlyArray of resource key strings (empty if none are present)
 */
export function listAttackResourceKeys(
	context: ResourceCarrier,
): ReadonlyArray<string> {
	const assets = readAssets(context);
	return freezeKeys(Object.keys(assets?.resources ?? {}));
}

/**
 * List all stat keys available in the provided translation context.
 *
 * @returns A frozen readonly array of stat key strings from the context's assets.stats, or an empty array if no stats are defined.
 */
export function listAttackStatKeys(
	context: StatCarrier,
): ReadonlyArray<string> {
	const assets = readAssets(context);
	return freezeKeys(Object.keys(assets?.stats ?? {}));
}