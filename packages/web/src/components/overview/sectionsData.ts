import type { ReactNode } from 'react';
import type { OverviewSectionDef } from './OverviewLayout';

export interface OverviewIconSet {
	expand?: ReactNode;
	build?: ReactNode;
	attack?: ReactNode;
	develop?: ReactNode;
	raisePop?: ReactNode;
	growth?: ReactNode;
	upkeep?: ReactNode;
	main?: ReactNode;
	land?: ReactNode;
	slot?: ReactNode;
	gold?: ReactNode;
	ap?: ReactNode;
	happiness?: ReactNode;
	castle?: ReactNode;
	army?: ReactNode;
	fort?: ReactNode;
	council?: ReactNode;
	legion?: ReactNode;
	fortifier?: ReactNode;
	citizen?: ReactNode;
}

export type OverviewIconKey = keyof OverviewIconSet;

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
				icon: icons[section.icon],
				title: section.title,
				paragraphs: section.paragraphs,
				...spanProps(section.span),
			} satisfies OverviewSectionDef;
		}

		return {
			kind: 'list',
			id: section.id,
			icon: icons[section.icon],
			title: section.title,
			items: section.items.map((item) => ({
				icon: item.icon ? icons[item.icon] : undefined,
				label: item.label,
				body: item.body,
			})),
			...spanProps(section.span),
		} satisfies OverviewSectionDef;
	});
}
