import type { SessionRegistries } from '../../../src/state/sessionRegistries';
import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol/session';
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

export function createLandDescriptor(): SessionMetadataDescriptor {
	return {
		label: 'Land Parcel',
		icon: '🗺️',
	};
}

export function createSlotDescriptor(): SessionMetadataDescriptor {
	return {
		label: 'Land Slot',
		icon: '🧱',
	};
}

export function createPassiveDescriptor(): SessionMetadataDescriptor {
	return {
		label: 'Passive Effect',
		icon: '✨',
	};
}
