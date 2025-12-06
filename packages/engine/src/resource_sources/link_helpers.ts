import type { ResourceSourceLink, ResourceSourceMeta } from '../state';

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}
	return true;
}

export function cloneResourceSourceLink(
	link: ResourceSourceLink | undefined,
): ResourceSourceLink | undefined {
	if (!link) {
		return undefined;
	}
	const clonedLink: ResourceSourceLink = {};
	if (link.type) {
		clonedLink.type = link.type;
	}
	if (link.id) {
		clonedLink.id = link.id;
	}
	if (link.detail) {
		clonedLink.detail = link.detail;
	}
	if (link.extra) {
		clonedLink.extra = { ...link.extra };
	}
	return clonedLink;
}

export function resourceSourceLinksEqual(
	first: ResourceSourceLink,
	second: ResourceSourceLink,
): boolean {
	return (
		first.type === second.type &&
		first.id === second.id &&
		first.detail === second.detail
	);
}

export function mergeLinkCollections(
	baseLinks: ResourceSourceLink[] | undefined,
	incomingLinks: ResourceSourceLink[] | undefined,
): ResourceSourceLink[] | undefined {
	if (!incomingLinks || incomingLinks.length === 0) {
		return baseLinks;
	}
	const mergedLinks = baseLinks
		? baseLinks.map((link) => cloneResourceSourceLink(link)!)
		: [];
	for (const incomingLink of incomingLinks) {
		const normalizedLink = cloneResourceSourceLink(incomingLink);
		if (!normalizedLink) {
			continue;
		}
		const hasExistingMatch = mergedLinks.some((existingLink) =>
			resourceSourceLinksEqual(existingLink, normalizedLink),
		);
		if (!hasExistingMatch) {
			mergedLinks.push(normalizedLink);
		}
	}
	return mergedLinks.length > 0 ? mergedLinks : undefined;
}

export function appendDependencyLink(
	meta: ResourceSourceMeta,
	link: ResourceSourceLink,
): void {
	const normalizedLink = cloneResourceSourceLink(link);
	if (!normalizedLink) {
		return;
	}
	const existingDependencies = meta.dependsOn || [];
	const alreadyTracked = existingDependencies.some((dependencyLink) =>
		resourceSourceLinksEqual(dependencyLink, normalizedLink),
	);
	if (!alreadyTracked) {
		meta.dependsOn = [...existingDependencies, normalizedLink];
	}
}

export function normalizeLink(value: unknown): ResourceSourceLink | undefined {
	if (!isPlainObject(value)) {
		return undefined;
	}
	const normalizedLink: ResourceSourceLink = {};
	if (typeof value.type === 'string' && value.type.trim()) {
		normalizedLink.type = value.type.trim();
	}
	if (typeof value.id === 'string' && value.id.trim()) {
		normalizedLink.id = value.id.trim();
	}
	if (typeof value.detail === 'string' && value.detail.trim()) {
		normalizedLink.detail = value.detail.trim();
	}
	const extraEntries = Object.entries(value).filter(
		([key]) => !['type', 'id', 'detail'].includes(key),
	);
	if (extraEntries.length > 0) {
		normalizedLink.extra = Object.fromEntries(extraEntries);
	}
	return Object.keys(normalizedLink).length > 0 ? normalizedLink : undefined;
}

export function normalizeLinks(
	value: unknown,
): ResourceSourceLink[] | undefined {
	if (!value) {
		return undefined;
	}
	const rawList = Array.isArray(value) ? value : [value];
	const normalizedList = rawList
		.map((entry) => normalizeLink(entry))
		.filter((entry): entry is ResourceSourceLink => Boolean(entry));
	return normalizedList.length > 0 ? normalizedList : undefined;
}
