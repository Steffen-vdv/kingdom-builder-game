import type { TranslationAssets, TranslationContext } from '../../../context';
import { humanizeIdentifier } from '../../stringUtils';

export type AttackRegistryDescriptor = { icon: string; label: string };

type AssetsCarrier =
	| Pick<TranslationContext, 'assets'>
	| { assets?: TranslationAssets };

type BuildingCarrier = Pick<TranslationContext, 'buildings'> & AssetsCarrier;

type ResourceCarrier = AssetsCarrier;

type StatCarrier = AssetsCarrier;

function coerceString(value: unknown): string | undefined {
	if (typeof value !== 'string') {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function coerceLabel(value: unknown, fallback: string): string {
	return coerceString(value) ?? fallback;
}

function coerceIcon(value: unknown): string {
	return coerceString(value) ?? '';
}

function readAssets(context: AssetsCarrier): TranslationAssets | undefined {
	return 'assets' in context ? context.assets : undefined;
}

function freezeKeys<T extends string>(keys: string[]): ReadonlyArray<T> {
	return Object.freeze(keys) as ReadonlyArray<T>;
}

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

export function selectAttackResourceV2Descriptor(
	context: ResourceCarrier,
	resourceId: string,
): AttackRegistryDescriptor {
	const assets = readAssets(context);
	const metadata = assets?.resourceV2.nodes.get(resourceId);
	const display = metadata?.display;
	const fallbackLabel = humanizeIdentifier(resourceId) || resourceId;
	const label = coerceLabel(display?.name, fallbackLabel);
	const icon = coerceIcon(display?.icon);
	return { icon, label };
}

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

export function listAttackResourceKeys(
	context: ResourceCarrier,
): ReadonlyArray<string> {
	const assets = readAssets(context);
	return freezeKeys(Object.keys(assets?.resources ?? {}));
}

export function listAttackStatKeys(
	context: StatCarrier,
): ReadonlyArray<string> {
	const assets = readAssets(context);
	return freezeKeys(Object.keys(assets?.stats ?? {}));
}
