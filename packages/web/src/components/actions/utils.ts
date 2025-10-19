import type { RegistryMetadataDescriptor } from '../../contexts/RegistryMetadataContext';

export type ResourceDescriptorSelector = (
	resourceKey: string,
) => RegistryMetadataDescriptor;

export function playerHasRequiredResources(
	playerResources: Record<string, number>,
	costs: Record<string, number>,
): boolean {
	return Object.entries(costs).every(([resourceKey, requiredAmount]) => {
		const playerAmount = Number(playerResources[resourceKey] ?? 0);
		const neededAmount = Number(requiredAmount ?? 0);
		if (!Number.isFinite(playerAmount) || !Number.isFinite(neededAmount)) {
			return false;
		}
		return playerAmount >= neededAmount;
	});
}

export function sumNonActionCosts(
	costs: Record<string, number>,
	actionCostResource: string,
): number {
	return Object.entries(costs).reduce((sum, [resourceKey, requiredAmount]) => {
		if (resourceKey === actionCostResource) {
			return sum;
		}
		const neededAmount = Number(requiredAmount ?? 0);
		if (!Number.isFinite(neededAmount)) {
			return sum;
		}
		return sum + neededAmount;
	}, 0);
}

export function getOptionalProperty<T>(
	value: unknown,
	property: string,
): T | undefined {
	if (typeof value === 'object' && value !== null && property in value) {
		return (value as Record<string, unknown>)[property] as T;
	}
	return undefined;
}

export function sumCleanupCosts(
	upkeep: Record<string, number | undefined> | undefined,
): number {
	if (!upkeep) {
		return 0;
	}
	return Object.values(upkeep).reduce<number>((sum, amount) => {
		const value = Number(amount ?? 0);
		if (!Number.isFinite(value)) {
			return sum;
		}
		return sum + value;
	}, 0);
}

export function formatMissingResources(
	costs: Record<string, number>,
	playerResources: Record<string, number | undefined>,
	selectResourceDescriptor: ResourceDescriptorSelector,
): string | undefined {
	const missing: string[] = [];
	for (const [resourceKey, cost] of Object.entries(costs)) {
		const normalizedCost = Number(cost ?? 0);
		const available = Number(playerResources[resourceKey] ?? 0);
		if (!Number.isFinite(normalizedCost) || !Number.isFinite(available)) {
			continue;
		}
		const shortage = normalizedCost - available;
		if (!Number.isFinite(shortage) || shortage <= 0) {
			continue;
		}
		const descriptor = selectResourceDescriptor(resourceKey);
		const icon = descriptor.icon ?? '';
		const label = descriptor.label ?? resourceKey;
		const display = icon ? `${icon} ${label}` : label;
		missing.push(`${shortage} ${display}`);
	}
	if (missing.length === 0) {
		return undefined;
	}
	return `Need ${missing.join(', ')}`;
}
