import { Resource, type ResourceKey } from '../state';
import type { RuntimeResourceCatalog } from './types';

function extractResourceSlug(resourceId: string): string {
	const delimiterIndex = resourceId.lastIndexOf(':');
	if (delimiterIndex === -1) {
		return resourceId;
	}
	return resourceId.slice(delimiterIndex + 1);
}

function normalize(value: string): string {
	return value
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((segment) => segment.toLowerCase())
		.join('-');
}

function acronym(value: string): string {
	return value
		.replace(/[^A-Za-z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((segment) => segment[0]!.toLowerCase())
		.join('');
}

export function mapResourceIdToLegacyKey(
	resourceId: string,
	catalog: RuntimeResourceCatalog,
): ResourceKey {
	const legacyKeys = Object.values(Resource);
	if (legacyKeys.length === 0) {
		throw new Error(
			'ResourceV2 legacy mapping requires Resource keys to be initialised before lookup.',
		);
	}
	if (legacyKeys.includes(resourceId)) {
		return resourceId;
	}
	const slug = normalize(extractResourceSlug(resourceId));
	const definition = catalog.resources.byId[resourceId];
	const labelSlug = definition ? normalize(definition.label) : '';
	const labelAcronym = definition ? acronym(definition.label) : '';
	for (const key of legacyKeys) {
		const keySlug = normalize(key);
		if (
			keySlug === slug ||
			(labelSlug && keySlug === labelSlug) ||
			(labelAcronym && keySlug === labelAcronym)
		) {
			return key;
		}
	}
	throw new Error(
		`ResourceV2 legacy mapping could not resolve a legacy key for "${resourceId}". ` +
			'Ensure the start configuration exposes a matching resource key.',
	);
}
