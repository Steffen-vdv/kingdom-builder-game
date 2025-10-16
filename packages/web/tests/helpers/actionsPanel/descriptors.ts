import type { SessionRegistries } from '../../../src/state/sessionRegistries';
import { humanizeId } from './statMetadata';
import type { ActionsPanelContent } from './contentBuilders';

type ResourceDescriptor = {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
	readonly description?: string;
};

export function createResourceDescriptors(
	sessionRegistries: SessionRegistries,
): Record<string, ResourceDescriptor> {
	return Object.fromEntries(
		Object.entries(sessionRegistries.resources).map(([key, definition]) => [
			key,
			{
				id: key,
				label: definition.label ?? humanizeId(key),
				icon: definition.icon,
				description: definition.description,
			},
		]),
	);
}

type PopulationDescriptor = {
	readonly id: string;
	readonly label: string;
	readonly icon?: string;
};

export function createPopulationDescriptors(
	populationDefinitions: ActionsPanelContent['registeredPopulationRoles'],
): Record<string, PopulationDescriptor> {
	return Object.fromEntries(
		populationDefinitions.map((definition) => [
			definition.id,
			{
				id: definition.id,
				label: definition.name,
				icon: definition.icon,
			},
		]),
	);
}

export function createSlotDescriptor(): {
	readonly id: string;
	readonly label: string;
	readonly icon: string;
} {
	return {
		id: 'slot',
		label: 'Land Slot',
		icon: '🧱',
	};
}
