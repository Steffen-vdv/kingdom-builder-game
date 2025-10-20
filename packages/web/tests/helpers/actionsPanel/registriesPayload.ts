import type { Registry } from '@kingdom-builder/protocol';
import type * as ProtocolSession from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from '../../../src/state/sessionRegistries';

function cloneValue<DefinitionType>(value: DefinitionType): DefinitionType {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as DefinitionType;
}

export function toRegistriesPayload(
	registries: SessionRegistries,
): ProtocolSession.SessionRegistriesPayload {
	const toEntries = <DefinitionType>(
		registry: Registry<DefinitionType>,
	): Record<string, DefinitionType> =>
		Object.fromEntries(
			registry.entries().map(([id, definition]) => {
				return [id, cloneValue(definition)];
			}),
		);
	const cloneResources = () =>
		Object.fromEntries(
			Object.entries(registries.resources).map(([key, definition]) => {
				return [key, cloneValue(definition)];
			}),
		);
	return {
		actions: toEntries(registries.actions),
		actionCategories: toEntries(
			registries.actionCategories as SessionRegistries['actions'],
		),
		buildings: toEntries(registries.buildings as SessionRegistries['actions']),
		developments: toEntries(
			registries.developments as SessionRegistries['actions'],
		),
		populations: toEntries(
			registries.populations as SessionRegistries['actions'],
		),
		resources: cloneResources(),
	};
}
