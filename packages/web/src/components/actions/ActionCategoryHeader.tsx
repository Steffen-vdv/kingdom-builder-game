import React from 'react';

const HEADING_CLASS = [
	'flex flex-wrap items-center gap-2 text-base font-medium',
	'text-slate-900 dark:text-slate-100',
].join(' ');
const SUBTITLE_CLASS = [
	'italic text-sm font-normal text-slate-600',
	'dark:text-slate-300',
].join(' ');
const ICON_CLASS = 'text-lg leading-none';

interface ActionCategoryHeaderProps {
	icon: React.ReactNode;
	title: string;
	subtitle?: string;
}

export default function ActionCategoryHeader({
	icon,
	title,
	subtitle,
}: ActionCategoryHeaderProps) {
	const iconNode = icon ? (
		<span aria-hidden className={ICON_CLASS}>
			{icon}
		</span>
	) : null;
	const subtitleNode = subtitle ? (
		<span className={SUBTITLE_CLASS}>{subtitle}</span>
	) : null;
	return (
		<header>
			<h3 className={HEADING_CLASS}>
				{iconNode}
				<span>{title}</span>
				{subtitleNode}
			</h3>
		</header>
	);
}
