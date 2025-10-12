import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol';
import type {
	SessionOverviewContent,
	SessionOverviewHero,
	SessionOverviewListItem,
	SessionOverviewListSection,
	SessionOverviewParagraphSection,
	SessionOverviewSection,
	SessionOverviewTokenCandidates,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type {
	AssetMetadata,
	MetadataLookup,
} from './registryMetadataDescriptors';

export interface MetadataSelector<TDescriptor extends { id: string }> {
	readonly byId: Readonly<Record<string, TDescriptor>>;
	readonly list: ReadonlyArray<TDescriptor>;
	select(id: string): TDescriptor;
	selectMany(ids: Iterable<string>): ReadonlyArray<TDescriptor>;
	selectRecord(ids: Iterable<string>): Readonly<Record<string, TDescriptor>>;
}

export interface AssetMetadataSelector {
	readonly descriptor: AssetMetadata;
	select(): AssetMetadata;
}

const freezeArray = <T>(values: T[]): ReadonlyArray<T> =>
	Object.freeze(values.slice());

const freezeRecord = <TValue>(record: Record<string, TValue>) =>
	Object.freeze({ ...record }) as Readonly<Record<string, TValue>>;

const freezeStringArray = (values: string[]): ReadonlyArray<string> =>
	Object.freeze(values.slice());

const freezeStringRecord = (record: Record<string, string>) =>
	Object.freeze({ ...record }) as Readonly<Record<string, string>>;

const filterStringEntries = (values: ReadonlyArray<unknown>): string[] =>
	values.filter((entry): entry is string => typeof entry === 'string');

const EMPTY_HERO_TOKENS = Object.freeze({}) as Readonly<Record<string, string>>;

export const createMetadataSelector = <TDescriptor extends { id: string }>(
	lookup: MetadataLookup<TDescriptor>,
): MetadataSelector<TDescriptor> => {
	const list = lookup.values();
	const byId = lookup.record;
	const select = (id: string): TDescriptor => lookup.get(id);
	const selectMany = (ids: Iterable<string>): ReadonlyArray<TDescriptor> =>
		freezeArray(Array.from(ids, (id) => select(id)));
	const selectRecord = (
		ids: Iterable<string>,
	): Readonly<Record<string, TDescriptor>> => {
		const entries = Array.from(ids, (id) => [id, select(id)] as const);
		return Object.freeze(Object.fromEntries(entries)) as Readonly<
			Record<string, TDescriptor>
		>;
	};
	return Object.freeze({
		byId,
		list,
		select,
		selectMany,
		selectRecord,
	});
};

export const createAssetMetadataSelector = (
	descriptor: AssetMetadata,
): AssetMetadataSelector =>
	Object.freeze({
		descriptor,
		select: () => descriptor,
	});

export type OverviewTokenCandidateMap = Readonly<
	Record<string, Readonly<Record<string, ReadonlyArray<string>>>>
>;

export interface OverviewHeroMetadata {
	readonly badgeIcon?: string;
	readonly badgeLabel?: string;
	readonly title?: string;
	readonly intro?: string;
	readonly paragraph?: string;
	readonly tokens: Readonly<Record<string, string>>;
}

export interface OverviewParagraphSectionMetadata {
	readonly kind: 'paragraph';
	readonly id: string;
	readonly icon: string;
	readonly title: string;
	readonly span?: boolean;
	readonly paragraphs: ReadonlyArray<string>;
}

export interface OverviewListItemMetadata {
	readonly icon?: string;
	readonly label: string;
	readonly body: ReadonlyArray<string>;
}

export interface OverviewListSectionMetadata {
	readonly kind: 'list';
	readonly id: string;
	readonly icon: string;
	readonly title: string;
	readonly span?: boolean;
	readonly items: ReadonlyArray<OverviewListItemMetadata>;
}

export type OverviewSectionMetadata =
	| OverviewParagraphSectionMetadata
	| OverviewListSectionMetadata;

export interface OverviewContentMetadata {
	readonly hero: OverviewHeroMetadata;
	readonly sections: ReadonlyArray<OverviewSectionMetadata>;
	readonly tokens: OverviewTokenCandidateMap;
}

const readMetadataEntry = (
	snapshot: SessionSnapshotMetadata,
	key: string,
): unknown => {
	if (typeof snapshot !== 'object' || snapshot === null) {
		return undefined;
	}
	if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
		return undefined;
	}
	const record = snapshot as unknown as Record<string, unknown>;
	return record[key];
};

const toUnknownRecord = (
	value: unknown,
): Record<string, unknown> | undefined => {
	if (typeof value !== 'object' || value === null) {
		return undefined;
	}
	return value as Record<string, unknown>;
};

const isMetadataDescriptor = (
	value: unknown,
): value is SessionMetadataDescriptor =>
	typeof value === 'object' && value !== null;

const toMetadataDescriptorRecord = (
	value: unknown,
): Record<string, SessionMetadataDescriptor> | undefined => {
	const record = toUnknownRecord(value);
	if (!record) {
		return undefined;
	}
	for (const descriptor of Object.values(record)) {
		if (!isMetadataDescriptor(descriptor)) {
			return undefined;
		}
	}
	return record as Record<string, SessionMetadataDescriptor>;
};

export const extractDescriptorRecord = (
	snapshot: SessionSnapshotMetadata,
	key: string,
): Record<string, SessionMetadataDescriptor> | undefined =>
	toMetadataDescriptorRecord(readMetadataEntry(snapshot, key));

export const extractPhaseRecord = (
	snapshot: SessionSnapshotMetadata,
): SessionSnapshotMetadata['phases'] => {
	const record = toUnknownRecord(readMetadataEntry(snapshot, 'phases'));
	if (!record) {
		return undefined as SessionSnapshotMetadata['phases'];
	}
	return record as SessionSnapshotMetadata['phases'];
};

export const extractTriggerRecord = (
	snapshot: SessionSnapshotMetadata,
): SessionSnapshotMetadata['triggers'] => {
	const record = toUnknownRecord(readMetadataEntry(snapshot, 'triggers'));
	if (!record) {
		return undefined as SessionSnapshotMetadata['triggers'];
	}
	return record as SessionSnapshotMetadata['triggers'];
};

const normalizeHero = (
	hero: SessionOverviewHero | undefined,
): OverviewHeroMetadata => {
	if (!hero) {
		return Object.freeze({ tokens: EMPTY_HERO_TOKENS });
	}
	const tokens: Record<string, string> = {};
	if (hero.tokens) {
		for (const [key, value] of Object.entries(hero.tokens)) {
			if (typeof value === 'string') {
				tokens[key] = value;
			}
		}
	}
	const entry = {
		...(hero.badgeIcon !== undefined ? { badgeIcon: hero.badgeIcon } : {}),
		...(hero.badgeLabel !== undefined ? { badgeLabel: hero.badgeLabel } : {}),
		...(hero.title !== undefined ? { title: hero.title } : {}),
		...(hero.intro !== undefined ? { intro: hero.intro } : {}),
		...(hero.paragraph !== undefined ? { paragraph: hero.paragraph } : {}),
		tokens: freezeStringRecord(tokens),
	} satisfies OverviewHeroMetadata;
	return Object.freeze(entry);
};

const normalizeParagraphSection = (
	section: SessionOverviewParagraphSection,
	fallbackId: string,
): OverviewParagraphSectionMetadata => {
	const paragraphs = Array.isArray(section.paragraphs)
		? filterStringEntries(section.paragraphs)
		: [];
	const entry = {
		kind: 'paragraph',
		id: section.id ?? fallbackId,
		icon: section.icon ?? '',
		title: section.title ?? '',
		paragraphs: freezeStringArray(paragraphs),
		...(section.span !== undefined ? { span: section.span } : {}),
	} satisfies OverviewParagraphSectionMetadata;
	return Object.freeze(entry);
};

const normalizeListItem = (
	item: SessionOverviewListItem,
): OverviewListItemMetadata => {
	const body = Array.isArray(item.body) ? filterStringEntries(item.body) : [];
	const entry = {
		label: item.label ?? '',
		body: freezeStringArray(body),
		...(item.icon !== undefined ? { icon: item.icon } : {}),
	} satisfies OverviewListItemMetadata;
	return Object.freeze(entry);
};

const normalizeListSection = (
	section: SessionOverviewListSection,
	fallbackId: string,
): OverviewListSectionMetadata => {
	const items = Array.isArray(section.items)
		? section.items.map(normalizeListItem)
		: [];
	const entry = {
		kind: 'list',
		id: section.id ?? fallbackId,
		icon: section.icon ?? '',
		title: section.title ?? '',
		items: freezeArray(items),
		...(section.span !== undefined ? { span: section.span } : {}),
	} satisfies OverviewListSectionMetadata;
	return Object.freeze(entry);
};

const normalizeSection = (
	section: SessionOverviewSection,
	index: number,
): OverviewSectionMetadata | null => {
	const fallbackId = `section_${index}`;
	if (section.kind === 'paragraph') {
		return normalizeParagraphSection(section, fallbackId);
	}
	if (section.kind === 'list') {
		return normalizeListSection(section, fallbackId);
	}
	return null;
};

const normalizeTokenCandidates = (
	candidates: SessionOverviewTokenCandidates | undefined,
): OverviewTokenCandidateMap => {
	if (!candidates) {
		return Object.freeze({});
	}
	const record: Record<
		string,
		Readonly<Record<string, ReadonlyArray<string>>>
	> = {};
	for (const [category, entries] of Object.entries(candidates)) {
		if (!entries) {
			continue;
		}
		const normalizedEntries: Record<string, ReadonlyArray<string>> = {};
		for (const [tokenKey, values] of Object.entries(entries)) {
			if (!Array.isArray(values)) {
				continue;
			}
			const normalized = filterStringEntries(values);
			if (normalized.length === 0) {
				continue;
			}
			const unique = Array.from(new Set(normalized));
			normalizedEntries[tokenKey] = freezeStringArray(unique);
		}
		if (Object.keys(normalizedEntries).length > 0) {
			record[category] = freezeRecord(normalizedEntries);
		}
	}
	return freezeRecord(record);
};

const createOverviewContent = (
	overview: SessionOverviewContent,
): OverviewContentMetadata => {
	const normalized = Array.isArray(overview.sections)
		? overview.sections.map((section, index) =>
				normalizeSection(section, index),
			)
		: [];
	const sections = normalized.filter(
		(section): section is OverviewSectionMetadata => section !== null,
	);
	return Object.freeze({
		hero: normalizeHero(overview.hero),
		sections: freezeArray(sections),
		tokens: normalizeTokenCandidates(overview.tokens),
	});
};

const EMPTY_SECTION_LIST = Object.freeze(
	[],
) as ReadonlyArray<OverviewSectionMetadata>;
const EMPTY_TOKEN_MAP = Object.freeze({}) as OverviewTokenCandidateMap;

const EMPTY_OVERVIEW_CONTENT: OverviewContentMetadata = Object.freeze({
	hero: normalizeHero(undefined),
	sections: EMPTY_SECTION_LIST,
	tokens: EMPTY_TOKEN_MAP,
});

export const extractOverviewContent = (
	snapshot: SessionSnapshotMetadata,
): OverviewContentMetadata => {
	const value = readMetadataEntry(snapshot, 'overview');
	if (typeof value !== 'object' || value === null) {
		return EMPTY_OVERVIEW_CONTENT;
	}
	return createOverviewContent(value as SessionOverviewContent);
};
