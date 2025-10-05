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
	subtitle: string;
}

export default function ActionCategoryHeader({
	icon,
	title,
	subtitle,
}: ActionCategoryHeaderProps) {
	return (
		<header>
			<h3 className={HEADING_CLASS}>
				<span aria-hidden className={ICON_CLASS}>
					{icon}
				</span>
				<span>{title}</span>
				<span className={SUBTITLE_CLASS}>{subtitle}</span>
			</h3>
		</header>
	);
}
