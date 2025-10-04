import type { ReactNode } from 'react';
import type { OverviewSectionDef } from './OverviewLayout';

export type OverviewIconSet = Record<string, ReactNode | undefined>;

export type OverviewIconKey = string;

export type OverviewParagraphContent = {
	kind: 'paragraph';
	id: string;
	icon: OverviewIconKey;
	title: string;
	span?: boolean;
	paragraphs: string[];
};

export type OverviewListItemContent = {
	icon?: OverviewIconKey;
	label: string;
	body: string[];
};

export type OverviewListContent = {
	kind: 'list';
	id: string;
	icon: OverviewIconKey;
	title: string;
	span?: boolean;
	items: OverviewListItemContent[];
};

export type OverviewContentSection =
	| OverviewParagraphContent
	| OverviewListContent;

function spanProps(span?: boolean) {
	return span === undefined ? {} : { span };
}

export function createOverviewSections(
	icons: OverviewIconSet,
	content: OverviewContentSection[],
): OverviewSectionDef[] {
	return content.map((section) => {
		if (section.kind === 'paragraph') {
			return {
				kind: 'paragraph',
				id: section.id,
				icon: icons[section.icon] ?? null,
				title: section.title,
				paragraphs: section.paragraphs,
				...spanProps(section.span),
			} satisfies OverviewSectionDef;
		}

		return {
			kind: 'list',
			id: section.id,
			icon: icons[section.icon] ?? null,
			title: section.title,
			items: section.items.map((item) => ({
				icon: item.icon ? (icons[item.icon] ?? null) : undefined,
				label: item.label,
				body: item.body,
			})),
			...spanProps(section.span),
		} satisfies OverviewSectionDef;
	});
}
