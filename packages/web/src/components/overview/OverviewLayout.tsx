import React from 'react';

export const SECTION_CLASS = [
	'rounded-2xl border border-white/60 bg-white/55 p-6',
	'shadow-inner backdrop-blur-sm',
	'dark:border-white/10 dark:bg-white/5',
].join(' ');

export const SECTION_TITLE_CLASS = [
	'flex items-center gap-2 text-base font-semibold',
	'text-slate-900 dark:text-slate-100',
].join(' ');

export const PARAGRAPH_CLASS = [
	'mt-3 text-sm leading-relaxed text-slate-700',
	'dark:text-slate-300/80',
].join(' ');

export const LIST_CLASS = 'mt-3 space-y-3';
export const LIST_ITEM_CLASS = 'space-y-1';
export const LIST_HEADING_CLASS = 'flex items-center gap-2';

export const SECTION_EMPHASIS_CLASS = [
	'font-semibold text-slate-900',
	'dark:text-slate-100',
].join(' ');

export const LIST_TEXT_CLASS = [
	'text-sm leading-relaxed text-slate-700',
	'dark:text-slate-300/80',
].join(' ');

export const OVERVIEW_CARD_CLASS = [
	'max-w-4xl space-y-8 text-left text-slate-700',
	'dark:text-slate-200',
].join(' ');

export const OVERVIEW_GRID_CLASS = 'grid gap-6 md:grid-cols-2';

export const OVERVIEW_BACK_BUTTON_CLASS = [
	'w-full rounded-full border border-white/50 bg-white/60 px-6 py-3',
	'text-sm font-semibold text-slate-700 shadow-md transition',
	'hover:border-white/70 hover:bg-white/80',
	'dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
	'dark:hover:border-white/20 dark:hover:bg-white/10 sm:w-auto frosted-surface',
].join(' ');

export type OverviewParagraphDef = {
	kind: 'paragraph';
	id: string;
	icon: React.ReactNode;
	title: string;
	span?: boolean;
	paragraphs: string[];
};

export type OverviewListItemDef = {
	icon?: React.ReactNode;
	label: string;
	body: string[];
};

export type OverviewListDef = {
	kind: 'list';
	id: string;
	icon: React.ReactNode;
	title: string;
	span?: boolean;
	items: OverviewListItemDef[];
};

export type OverviewSectionDef = OverviewParagraphDef | OverviewListDef;

export type ParagraphSectionProps = {
	icon: React.ReactNode;
	title: string;
	span?: boolean;
	paragraphs: React.ReactNode[];
};

type RenderedListItem = {
	icon?: React.ReactNode;
	label: React.ReactNode;
	body: React.ReactNode[];
};

export type ListSectionProps = {
	icon: React.ReactNode;
	title: string;
	span?: boolean;
	items: RenderedListItem[];
};

export function sectionClass(span?: boolean) {
	return [SECTION_CLASS, span ? 'md:col-span-2' : ''].filter(Boolean).join(' ');
}

export function renderTokens<TTokens extends Record<string, React.ReactNode>>(
	text: string,
	tokens: TTokens,
): React.ReactNode {
	const parts = text.split(/(\{[\w]+\})/g);
	return (
		<>
			{parts.map((part, index) => {
				const match = part.match(/^\{([\w]+)\}$/);
				if (match) {
					const tokenKey = match[1] as keyof TTokens;
					const hasToken = Object.prototype.hasOwnProperty.call(
						tokens,
						tokenKey,
					);
					if (hasToken) {
						return (
							<React.Fragment key={index}>
								{tokens[tokenKey] ?? match[0]}
							</React.Fragment>
						);
					}
					/* prettier-ignore */
					return (
					<React.Fragment key={index}>
{match[0]}
</React.Fragment>
);
				}
				/* prettier-ignore */
				return (
					<React.Fragment key={index}>
				{part}
			</React.Fragment>
		);
			})}
		</>
	);
}

export function ParagraphSection({
	icon,
	title,
	paragraphs,
	span,
}: ParagraphSectionProps) {
	return (
		<section className={sectionClass(span)}>
			<h2 className={SECTION_TITLE_CLASS}>
				<span>{icon}</span>
				<span>{title}</span>
			</h2>
			{paragraphs.map((content, index) => (
				<p key={index} className={PARAGRAPH_CLASS}>
					{content}
				</p>
			))}
		</section>
	);
}

export function ListSection({ icon, title, items, span }: ListSectionProps) {
	return (
		<section className={sectionClass(span)}>
			<h2 className={SECTION_TITLE_CLASS}>
				<span>{icon}</span>
				<span>{title}</span>
			</h2>
			<ul className={LIST_CLASS}>
				{items.map((item, index) => (
					<li key={index} className={LIST_ITEM_CLASS}>
						<div className={LIST_HEADING_CLASS}>
							{item.icon ? <span>{item.icon}</span> : null}
							{/* prettier-ignore */}
							<span className={SECTION_EMPHASIS_CLASS}>
                                                                {item.label}
                                                        </span>
						</div>
						{item.body.map((content, bodyIndex) => (
							<p key={bodyIndex} className={LIST_TEXT_CLASS}>
								{content}
							</p>
						))}
					</li>
				))}
			</ul>
		</section>
	);
}
